package com.kiranape.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineLayout: LinearLayout
    private lateinit var btnRetry: Button

    // Web App URL
    private val appUrl = "https://chaurasia-kirana-app.ai.studio/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)
        progressBar = findViewById(R.id.progressBar)
        offlineLayout = findViewById(R.id.offlineLayout)
        btnRetry = findViewById(R.id.btnRetry)

        setupWebView()
        setupSwipeRefresh()
        setupBackNavigation()

        btnRetry.setOnClickListener {
            if (isNetworkAvailable()) {
                offlineLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE
                webView.reload()
            } else {
                Toast.makeText(this, "Still offline. Please check your internet connection.", Toast.LENGTH_SHORT).show()
            }
        }

        if (savedInstanceState == null) {
            if (isNetworkAvailable()) {
                webView.loadUrl(appUrl)
            } else {
                showOfflineScreen()
            }
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings

        // 1. Enable JavaScript and modern HTML5 Web Storage (Required for Firebase and React state)
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true

        // 2. Performance & Caching (Optimized for fast grocery shopping experience)
        settings.cacheMode = if (isNetworkAvailable()) {
            WebSettings.LOAD_DEFAULT
        } else {
            WebSettings.LOAD_CACHE_ELSE_NETWORK
        }

        // 3. Viewport & Scaling
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.builtInZoomControls = false
        settings.displayZoomControls = false

        // 4. Security
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        // 5. Append Custom User-Agent identifier for Android App analytics
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent KiranapeAndroidApp/1.0"

        // WebChromeClient for page loading progress bar
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                    swipeRefreshLayout.isRefreshing = false
                }
            }
        }

        // WebViewClient for navigation and deep link handling (WhatsApp, Phone calls, etc.)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return handleCustomUrlIntents(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url == null) return false
                return handleCustomUrlIntents(url)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                offlineLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefreshLayout.isRefreshing = false
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // If the primary page failed to load due to no connectivity, show friendly offline view
                if (request?.isForMainFrame == true && !isNetworkAvailable()) {
                    showOfflineScreen()
                }
            }
        }
    }

    /**
     * Intercept and handle special URL schemes:
     * - tel: Launches system dialer with store phone number
     * - whatsapp: Launches WhatsApp chat directly for customer support/orders
     * - mailto: Launches email client for privacy policy data deletion
     * - External URLs: Opened safely in external browser
     */
    private fun handleCustomUrlIntents(url: String): Boolean {
        return when {
            // 1. Phone dialer links (e.g., tel:9424316081)
            url.startsWith("tel:") -> {
                try {
                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Cannot make phone call on this device", Toast.LENGTH_SHORT).show()
                }
                true
            }

            // 2. WhatsApp links (wa.me, api.whatsapp.com, or whatsapp://send)
            url.startsWith("whatsapp:") || url.contains("wa.me") || url.contains("api.whatsapp.com") -> {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    intent.setPackage("com.whatsapp")
                    startActivity(intent)
                } catch (e: ActivityNotFoundException) {
                    // Try WhatsApp Business if normal WhatsApp isn't installed
                    try {
                        val bizIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        bizIntent.setPackage("com.whatsapp.w4b")
                        startActivity(bizIntent)
                    } catch (e2: Exception) {
                        // Fallback to standard browser or Play Store
                        try {
                            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            startActivity(webIntent)
                        } catch (e3: Exception) {
                            Toast.makeText(this, "WhatsApp is not installed on this device", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                true
            }

            // 3. Email links (e.g. mailto:mohitformc@gmail.com)
            url.startsWith("mailto:") -> {
                try {
                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "No email client installed", Toast.LENGTH_SHORT).show()
                }
                true
            }

            // 4. Stay inside WebView for internal store pages
            url.contains("chaurasia-kirana-app.ai.studio") ||
            url.contains("run.app") ||
            url.startsWith("http://localhost") -> {
                false // Let WebView load it
            }

            // 5. External links: open in system default browser
            url.startsWith("http://") || url.startsWith("https://") -> {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    false
                }
                true
            }

            else -> false
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefreshLayout.setColorSchemeColors(0xFF15803D.toInt(), 0xFF16A34A.toInt())
        swipeRefreshLayout.setOnRefreshListener {
            if (isNetworkAvailable()) {
                webView.reload()
            } else {
                swipeRefreshLayout.isRefreshing = false
                Toast.makeText(this, "Device is offline", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Modern Android 13+ (API 33+) Predictive Back Navigation
     * If the webView has navigation history, go back inside the store; otherwise exit app.
     */
    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun showOfflineScreen() {
        webView.visibility = View.GONE
        offlineLayout.visibility = View.VISIBLE
        swipeRefreshLayout.isRefreshing = false
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo ?: return false
            @Suppress("DEPRECATION")
            return networkInfo.isConnected
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
