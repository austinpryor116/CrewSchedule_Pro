package com.crewschedule.pro;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.text.InputType;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.app.DatePickerDialog;
import android.widget.DatePicker;
import android.view.inputmethod.EditorInfo;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.view.Window;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String DESKTOP_USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    private FrameLayout portalLayout;
    private WebView portalWebView;
    private TextView urlStatusText;
    private EditText manualCommandInput;
    private ProgressBar progressBar;
    private LinearLayout keypadLayout;
    private LinearLayout manualTypeBar;
    private ScrollView keyScroll;
    private LinearLayout bottomActionBar;
    private boolean isSplitMode = true;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        WebView.setWebContentsDebuggingEnabled(true);

        if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.CAMERA}, 101);
        }

        configureMainWebView();
        setupPortalOverlay();
    }

    @Override
    public void onStart() {
        super.onStart();
        configureMainWebView();
    }

    private void configureMainWebView() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setUserAgentString(DESKTOP_USER_AGENT);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            settings.setMediaPlaybackRequiresUserGesture(false);

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            WebChromeClient currentChromeClient = webView.getWebChromeClient();
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (currentChromeClient != null) {
                        return currentChromeClient.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                    }
                    return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                }
            });

            webView.addJavascriptInterface(new PortalBridge(), "NativePortal");
        }
    }

    private boolean lastKeyboardStateKnown = false;
    private boolean lastIsKeyboardOpen = false;

    private void setupPortalOverlay() {
        if (portalLayout != null) return;

        portalLayout = new FrameLayout(this);
        portalLayout.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        portalLayout.setBackgroundColor(Color.parseColor("#000000"));
        portalLayout.setVisibility(View.GONE);

        final LinearLayout contentLinear = new LinearLayout(this);
        contentLinear.setOrientation(LinearLayout.VERTICAL);
        contentLinear.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        portalLayout.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            if (portalLayout.getVisibility() != View.VISIBLE) return;

            android.graphics.Rect r = new android.graphics.Rect();
            portalLayout.getWindowVisibleDisplayFrame(r);
            int screenHeight = portalLayout.getRootView().getHeight();
            int keypadHeight = screenHeight - r.bottom;

            boolean isKeyboardOpen = keypadHeight > screenHeight * 0.15;

            if (lastKeyboardStateKnown && lastIsKeyboardOpen == isKeyboardOpen) {
                return;
            }
            lastKeyboardStateKnown = true;
            lastIsKeyboardOpen = isKeyboardOpen;

            if (keyScroll != null) {
                keyScroll.setVisibility(isKeyboardOpen ? View.GONE : View.VISIBLE);
            }
            if (bottomActionBar != null) {
                bottomActionBar.setVisibility(isKeyboardOpen ? View.GONE : View.VISIBLE);
            }

            if (keypadLayout != null) {
                LinearLayout.LayoutParams kp = (LinearLayout.LayoutParams) keypadLayout.getLayoutParams();
                if (kp != null) {
                    if (isKeyboardOpen) {
                        kp.height = ViewGroup.LayoutParams.WRAP_CONTENT;
                        kp.weight = 0.0f;
                        keypadLayout.setPadding(dpToPx(6), dpToPx(2), dpToPx(6), 0);
                    } else {
                        kp.height = 0;
                        kp.weight = 0.9f;
                        keypadLayout.setPadding(dpToPx(8), dpToPx(8), dpToPx(8), dpToPx(10));
                    }
                    keypadLayout.setLayoutParams(kp);
                }
            }

            if (manualTypeBar != null) {
                manualTypeBar.setPadding(0, 0, 0, isKeyboardOpen ? 0 : dpToPx(8));
            }

            if (portalWebView != null) {
                LinearLayout.LayoutParams wp = (LinearLayout.LayoutParams) portalWebView.getLayoutParams();
                if (wp != null) {
                    wp.weight = isKeyboardOpen ? 1.0f : 1.1f;
                    portalWebView.setLayoutParams(wp);
                }
            }

            FrameLayout.LayoutParams clp = (FrameLayout.LayoutParams) contentLinear.getLayoutParams();
            if (clp != null) {
                int targetHeight = isKeyboardOpen ? r.bottom : ViewGroup.LayoutParams.MATCH_PARENT;
                if (clp.height != targetHeight) {
                    clp.height = targetHeight;
                    contentLinear.setLayoutParams(clp);
                }
            }
        });

        // 1. Top Minimal Navigation Bar
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        int padH = dpToPx(10);
        int padV = dpToPx(6);
        header.setPadding(padH, padV + dpToPx(24), padH, padV);
        header.setBackgroundColor(Color.parseColor("#0A192F"));

        TextView backBtn = createHeaderButton("◀", v -> {
            if (portalWebView != null && portalWebView.canGoBack()) portalWebView.goBack();
        });

        TextView fwdBtn = createHeaderButton("▶", v -> {
            if (portalWebView != null && portalWebView.canGoForward()) portalWebView.goForward();
        });

        TextView refreshBtn = createHeaderButton("↻", v -> {
            if (portalWebView != null) portalWebView.reload();
        });

        urlStatusText = new TextView(this);
        urlStatusText.setText("AA WebFOS / DECS Terminal");
        urlStatusText.setTextColor(Color.WHITE);
        urlStatusText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        urlStatusText.setTypeface(Typeface.DEFAULT_BOLD);
        urlStatusText.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        titleParams.setMargins(dpToPx(8), 0, dpToPx(8), 0);
        urlStatusText.setLayoutParams(titleParams);

        TextView toggleViewBtn = createHeaderButton("⌨ Split", v -> toggleSplitFullscreen());
        TextView closeBtn = createHeaderButton("✕ Close", v -> hidePortalView());

        header.addView(backBtn);
        header.addView(fwdBtn);
        header.addView(refreshBtn);
        header.addView(urlStatusText);
        header.addView(toggleViewBtn);
        header.addView(closeBtn);

        // Progress Bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dpToPx(3)));
        progressBar.setMax(100);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.GONE);

        // 2. Top Half: Terminal WebView (Isolated DECS Canvas)
        portalWebView = new WebView(this);
        LinearLayout.LayoutParams wvParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1.1f
        );
        portalWebView.setLayoutParams(wvParams);
        portalWebView.setBackgroundColor(Color.parseColor("#000000"));

        WebSettings pSettings = portalWebView.getSettings();
        pSettings.setUserAgentString(DESKTOP_USER_AGENT);
        pSettings.setJavaScriptEnabled(true);
        pSettings.setDomStorageEnabled(true);
        pSettings.setDatabaseEnabled(true);
        pSettings.setAllowFileAccess(true);
        pSettings.setAllowContentAccess(true);
        pSettings.setAllowFileAccessFromFileURLs(true);
        pSettings.setAllowUniversalAccessFromFileURLs(true);
        pSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        pSettings.setSupportMultipleWindows(true);
        pSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        pSettings.setLoadWithOverviewMode(true);
        pSettings.setUseWideViewPort(true);
        pSettings.setBuiltInZoomControls(true);
        pSettings.setDisplayZoomControls(false);

        CookieManager pCookieManager = CookieManager.getInstance();
        pCookieManager.setAcceptCookie(true);
        pCookieManager.setAcceptThirdPartyCookies(portalWebView, true);

        portalWebView.addJavascriptInterface(new PortalBridge(), "AndroidPortal");

        portalWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (url != null) {
                    String lower = url.toLowerCase();
                    boolean isLogin = (lower.contains("login") || lower.contains("sso") || lower.contains("okta") || lower.contains("ping") || lower.contains("saml")) && !lower.contains("websabre");
                    portalWebView.getSettings().setUseWideViewPort(isLogin);
                    portalWebView.getSettings().setLoadWithOverviewMode(isLogin);
                }
                isolateAndFitDecsCanvas();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (progressBar != null) {
                    progressBar.setVisibility(View.GONE);
                }
                if (url != null) {
                    String lower = url.toLowerCase();
                    boolean isLogin = (lower.contains("login") || lower.contains("sso") || lower.contains("okta") || lower.contains("ping") || lower.contains("saml")) && !lower.contains("websabre");
                    portalWebView.getSettings().setUseWideViewPort(isLogin);
                    portalWebView.getSettings().setLoadWithOverviewMode(isLogin);
                }
                isolateAndFitDecsCanvas();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        portalWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("DECS_CONSOLE", "[" + consoleMessage.messageLevel() + "] " + consoleMessage.message());
                return true;
            }

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress > 30) {
                    isolateAndFitDecsCanvas();
                }
                if (progressBar != null) {
                    if (newProgress < 100) {
                        progressBar.setVisibility(View.VISIBLE);
                        progressBar.setProgress(newProgress);
                    } else {
                        progressBar.setVisibility(View.GONE);
                    }
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView.HitTestResult result = view.getHitTestResult();
                String data = result != null ? result.getExtra() : null;
                if (data != null && !data.isEmpty()) {
                    view.loadUrl(data);
                    return true;
                }
                WebView newWebView = new WebView(MainActivity.this);
                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, String url) {
                        view.loadUrl(url);
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                if (transport != null) {
                    transport.setWebView(newWebView);
                    resultMsg.sendToTarget();
                }
                return true;
            }
        });

        // 3. Bottom Half: Dedicated Typing Box Directly Above Explicit DECS Buttons Only
        keypadLayout = buildExplicitDecsKeypad();

        contentLinear.addView(header);
        contentLinear.addView(progressBar);
        contentLinear.addView(portalWebView);
        contentLinear.addView(keypadLayout);
        portalLayout.addView(contentLinear);

        ViewGroup contentParent = findViewById(android.R.id.content);
        if (contentParent != null) {
            contentParent.addView(portalLayout, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));
        } else {
            addContentView(portalLayout, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));
        }
    }

    private void toggleSplitFullscreen() {
        isSplitMode = !isSplitMode;
        if (keypadLayout != null) {
            keypadLayout.setVisibility(isSplitMode ? View.VISIBLE : View.GONE);
        }
        if (portalWebView != null) {
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) portalWebView.getLayoutParams();
            lp.weight = isSplitMode ? 1.1f : 1.0f;
            portalWebView.setLayoutParams(lp);
        }
    }

    private LinearLayout buildExplicitDecsKeypad() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams rootParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            0.9f
        );
        root.setLayoutParams(rootParams);
        root.setBackgroundColor(Color.parseColor("#080E1E"));
        root.setPadding(dpToPx(8), dpToPx(8), dpToPx(8), dpToPx(10));

        // 1. Manual DECS Typing Area Right Above the Buttons
        manualTypeBar = new LinearLayout(this);
        manualTypeBar.setOrientation(LinearLayout.HORIZONTAL);
        manualTypeBar.setGravity(Gravity.CENTER_VERTICAL);
        manualTypeBar.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        manualTypeBar.setPadding(0, 0, 0, dpToPx(8));

        manualCommandInput = new EditText(this);
        manualCommandInput.setHint("Type DECS command (e.g. HSS/14731)...");
        manualCommandInput.setHintTextColor(Color.parseColor("#64748B"));
        manualCommandInput.setTextColor(Color.parseColor("#38BDF8"));
        manualCommandInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        manualCommandInput.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        manualCommandInput.setInputType(InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS | InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        manualCommandInput.setImeOptions(EditorInfo.IME_ACTION_SEND);
        manualCommandInput.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
        manualCommandInput.setText("");
        manualCommandInput.setBackground(createRoundedDrawable("#1E293B", "#38BDF8", dpToPx(8)));
        manualCommandInput.setPadding(dpToPx(12), dpToPx(8), dpToPx(12), dpToPx(8));
        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        manualCommandInput.setLayoutParams(inputParams);

        manualCommandInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND || actionId == EditorInfo.IME_ACTION_DONE) {
                String cmd = manualCommandInput.getText().toString().trim();
                if (!cmd.isEmpty()) {
                    sendDirectDecsCommand(cmd);
                    manualCommandInput.setText("");
                }
                return true;
            }
            return false;
        });

        TextView enterBtn = createKeypadButton("ENTER ↵", "#0284C7", "#FFFFFF", v -> {
            String cmd = manualCommandInput.getText().toString().trim();
            if (!cmd.isEmpty()) {
                sendDirectDecsCommand(cmd);
                manualCommandInput.setText("");
            }
        });
        enterBtn.setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8));
        LinearLayout.LayoutParams enterParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        enterParams.setMargins(dpToPx(6), 0, 0, 0);
        enterBtn.setLayoutParams(enterParams);

        TextView clrBtn = createKeypadButton("CLR", "#334155", "#94A3B8", v -> manualCommandInput.setText(""));
        clrBtn.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        LinearLayout.LayoutParams clrParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        clrParams.setMargins(dpToPx(4), 0, 0, 0);
        clrBtn.setLayoutParams(clrParams);

        manualTypeBar.addView(manualCommandInput);
        manualTypeBar.addView(enterBtn);
        manualTypeBar.addView(clrBtn);

        // 2. Only Requested DECS Buttons
        keyScroll = new ScrollView(this);
        keyScroll.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
        keyScroll.setFillViewport(true);

        LinearLayout keyGrid = new LinearLayout(this);
        keyGrid.setOrientation(LinearLayout.VERTICAL);
        keyGrid.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // SECTION 1: LOGIN & AUTH
        keyGrid.addView(createSectionHeader("🔐 LOGIN & AUTHENTICATION"));
        keyGrid.addView(createButtonRow(
            new KeyDef("🔑 1-Tap Login", "//MQ^BSIP742840^SARA202^", "#059669", true, true),
            new KeyDef("//MQ", "//MQ", "#0D9488", true, false)
        ));
        keyGrid.addView(createButtonRow(
            new KeyDef("BSIP742840", "BSIP742840", "#0284C7", true, false),
            new KeyDef("SARA202", "SARA202", "#4F46E5", true, false)
        ));

        // SECTION 2: SCHEDULES & PAIRINGS
        keyGrid.addView(createSectionHeader("📅 SCHEDULES & PAIRINGS"));
        keyGrid.addView(createButtonRow(
            new KeyDef("HI1 (Month 1)", "HI1", "#0284C7", false, false, true, false),
            new KeyDef("HI2 (Month 2)", "HI2", "#0284C7", false, false, true, false),
            new KeyDef("HSS (Pairing)", "HSS/", "#1E293B", false, false, false, true)
        ));
        keyGrid.addView(createButtonRow(
            new KeyDef("🏨 Hotel Request", "HOTEL_REQ", "#D97706", false, false, false, false, false, false, false, false, true)
        ));

        // SECTION 3: RESERVES & OPEN TIME
        keyGrid.addView(createSectionHeader("🛡️ RESERVES & OPEN TIME"));
        keyGrid.addView(createButtonRow(
            new KeyDef("N4D (Open Time)", "N4D", "#0284C7", false, false, false, false, false, false, true, false),
            new KeyDef("⚡ Open HSS", "OPEN_HSS", "#059669", false, false, false, false, false, false, false, true)
        ));
        keyGrid.addView(createButtonRow(
            new KeyDef("⚡ Pickup Trip (HTO)", "OPEN_TIME_PICKUP", "#9333EA", false, false, false, false, false, false, false, false, false, true),
            new KeyDef("N6D (Reserves)", "N6D", "#7C3AED", false, false, true, false)
        ));
        keyGrid.addView(createButtonRow(
            new KeyDef("HIHR (Turnback)", "HIHR", "#E11D48", false, false, false, false, true)
        ));

        // SECTION 4: TERMINAL NAVIGATION & CONTROLS
        keyGrid.addView(createSectionHeader("🕹️ TERMINAL NAVIGATION & CONTROLS"));
        keyGrid.addView(createButtonRow(
            new KeyDef("MD ⬇ (Next)", "MD", "#0369A1", true, false, false),
            new KeyDef("MU ⬆ (Prev)", "MU", "#0369A1", true, false, false),
            new KeyDef("↵ (Line Down)", "SHIFT_ENTER", "#059669", true, false, false)
        ));
        keyGrid.addView(createButtonRow(
            new KeyDef("⌂ Home", "CTRL_HOME", "#0D9488", true, false, false),
            new KeyDef("⌫ Clear", "CTRL_BACKSPACE", "#475569", true, false, false),
            new KeyDef("🛑 STOP Macro", "STOP", "#DC2626", false, false, false, false, false, true)
        ));

        keyScroll.addView(keyGrid);

        // 3. Bottom Big Schedule Sync Action Bar
        bottomActionBar = new LinearLayout(this);
        bottomActionBar.setOrientation(LinearLayout.HORIZONTAL);
        bottomActionBar.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        bottomActionBar.setPadding(0, dpToPx(6), 0, 0);

        TextView importActionBtn = new TextView(this);
        importActionBtn.setText("📋 1-Tap Import Visible Screen to Calendar");
        importActionBtn.setTextColor(Color.WHITE);
        importActionBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        importActionBtn.setTypeface(Typeface.DEFAULT_BOLD);
        importActionBtn.setGravity(Gravity.CENTER);
        importActionBtn.setBackground(createRoundedDrawable("#059669", "#10B981", dpToPx(10)));
        importActionBtn.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        importActionBtn.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        importActionBtn.setOnClickListener(v -> extractScheduleAndImport());

        bottomActionBar.addView(importActionBtn);

        root.addView(manualTypeBar);
        root.addView(keyScroll);
        root.addView(bottomActionBar);

        return root;
    }

    private TextView createSectionHeader(String title) {
        TextView tv = new TextView(this);
        tv.setText(title);
        tv.setTextColor(Color.parseColor("#94A3B8"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setPadding(dpToPx(4), dpToPx(8), dpToPx(4), dpToPx(2));
        return tv;
    }

    private String getDynamicN6dCommand() {
        java.util.Calendar cal = java.util.Calendar.getInstance();
        int day = cal.get(java.util.Calendar.DAY_OF_MONTH);
        String[] months = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};
        String monthStr = months[cal.get(java.util.Calendar.MONTH)];
        String dateStr = String.format(java.util.Locale.US, "%02d%s", day, monthStr); // e.g. "19AUG"
        return "N6D/ORD/" + dateStr + "/E75/CA^";
    }

    private static class KeyDef {
        String label;
        String command;
        String color;
        boolean sendImmediately;
        boolean isMultiStepMacro;
        boolean isHiMacro;
        boolean isHssMacro;
        boolean isHihrMacro;
        boolean isStopMacro;
        boolean isOpenTimeMacro;
        boolean isOpenHssMacro;
        boolean isHotelReqMacro;
        boolean isOpenTimePickupMacro;

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro, boolean isHihrMacro, boolean isStopMacro, boolean isOpenTimeMacro, boolean isOpenHssMacro, boolean isHotelReqMacro, boolean isOpenTimePickupMacro) {
            this.label = label;
            this.command = command;
            this.color = color;
            this.sendImmediately = sendImmediately;
            this.isMultiStepMacro = isMultiStepMacro;
            this.isHiMacro = isHiMacro;
            this.isHssMacro = isHssMacro;
            this.isHihrMacro = isHihrMacro;
            this.isStopMacro = isStopMacro;
            this.isOpenTimeMacro = isOpenTimeMacro;
            this.isOpenHssMacro = isOpenHssMacro;
            this.isHotelReqMacro = isHotelReqMacro;
            this.isOpenTimePickupMacro = isOpenTimePickupMacro;
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro, boolean isHihrMacro, boolean isStopMacro, boolean isOpenTimeMacro, boolean isOpenHssMacro, boolean isHotelReqMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, isHssMacro, isHihrMacro, isStopMacro, isOpenTimeMacro, isOpenHssMacro, isHotelReqMacro, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro, boolean isHihrMacro, boolean isStopMacro, boolean isOpenTimeMacro, boolean isOpenHssMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, isHssMacro, isHihrMacro, isStopMacro, isOpenTimeMacro, isOpenHssMacro, false, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro, boolean isHihrMacro, boolean isStopMacro, boolean isOpenTimeMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, isHssMacro, isHihrMacro, isStopMacro, isOpenTimeMacro, false, false, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro, boolean isHihrMacro, boolean isStopMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, isHssMacro, isHihrMacro, isStopMacro, false, false, false, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro, boolean isHihrMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, isHssMacro, isHihrMacro, false, false, false, false, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, isHssMacro, false, false, false, false, false, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, false, false, false, false, false, false, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, false, false, false, false, false, false, false, false);
        }
    }

    private void executeStopCommand() {
        Log.d("DECS_CONSOLE", "[LOG] [MainActivity] 🛑 STOP command triggered by user.");
        String stopJs = "(function() { " +
            "  if (typeof window.stopAutonomousCapture === 'function') { " +
            "    window.stopAutonomousCapture(); " +
            "  } else { " +
            "    window._decsCaptureAborted = true; " +
            "  } " +
            "})()";
        if (portalWebView != null) {
            portalWebView.evaluateJavascript(stopJs, null);
        }
        Toast.makeText(this, "🛑 Macro / Script Aborted", Toast.LENGTH_SHORT).show();
    }

    private void executeOpenTimePickupPopUpMacro() {
        Log.d("DECS_CONSOLE", "[LOG] [MainActivity] ⚡ Open Time Pickup triggered by user.");
        hidePortalView();

        String triggerJs = "(function() {" +
            "  try {" +
            "    if (window.__CREW_STORE__) {" +
            "      var state = window.__CREW_STORE__.getState();" +
            "      var openSeqs = state.openSequences || [];" +
            "      if (openSeqs.length > 0) {" +
            "        state.setSelectedOpenTimeForPickup(openSeqs[0]);" +
            "      }" +
            "      state.setIsPickupModalOpen(true);" +
            "    }" +
            "    if (window.dispatchEvent) {" +
            "      window.dispatchEvent(new CustomEvent('openTimePickupModal'));" +
            "    }" +
            "  } catch(e) {" +
            "    console.error('Error opening pickup modal:', e);" +
            "  }" +
            "})();";

        WebView mainWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (mainWebView != null) {
            mainWebView.evaluateJavascript(triggerJs, null);
        }
        if (portalWebView != null) {
            portalWebView.evaluateJavascript(triggerJs, null);
        }
    }

    private void executeHotelRequestPopUpMacro() {
        String triggerJs = "if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('openHotelRequestModal')); }";
        if (portalWebView != null) {
            portalWebView.evaluateJavascript(triggerJs, null);
        }
        WebView mainWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (mainWebView != null) {
            mainWebView.evaluateJavascript(triggerJs, null);
            String fetchProfileJs = "(function() { " +
                "  try { " +
                "    if (window.__CREW_STORE__) { " +
                "      return JSON.stringify(window.__CREW_STORE__.getState().userProfile || {}); " +
                "    } " +
                "    var raw = localStorage.getItem('crewschedule-store'); " +
                "    if (raw) { " +
                "      var p = JSON.parse(raw); " +
                "      if (p && p.state && p.state.userProfile) return JSON.stringify(p.state.userProfile); " +
                "    } " +
                "  } catch(e) {} " +
                "  return '{}'; " +
                "})()";
            mainWebView.evaluateJavascript(fetchProfileJs, new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String rawProfileJson) {
                    runOnUiThread(() -> renderNativeHotelRequestDialog(rawProfileJson));
                }
            });
        } else {
            runOnUiThread(() -> renderNativeHotelRequestDialog("{}"));
        }
    }

    private void renderNativeHotelRequestDialog(String rawProfileJson) {
        String name = "AUSTIN PRYOR";
        String empId = "742840";
        String defaultBase = "ORD";

        try {
            String jsonStr = rawProfileJson;
            if (jsonStr != null && jsonStr.startsWith("\"") && jsonStr.endsWith("\"") && jsonStr.length() > 1) {
                jsonStr = new JSONTokener(jsonStr).nextValue().toString();
            }
            if (jsonStr != null && !jsonStr.trim().isEmpty() && !jsonStr.equals("null") && !jsonStr.equals("{}")) {
                JSONObject obj = new JSONObject(jsonStr);
                String n = obj.optString("name", "").trim();
                if (!n.isEmpty()) name = n.toUpperCase();
                String e = obj.optString("employeeId", "").trim();
                if (!e.isEmpty()) empId = e;
                String b = obj.optString("base", "").trim().toUpperCase();
                if (!b.isEmpty()) defaultBase = b;
            }
        } catch (Exception ignored) {}

        final String finalName = name;
        final String finalEmpId = empId;

        final android.app.Dialog dialog = new android.app.Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        final LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#FFFFFF"));

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setBackgroundColor(Color.parseColor("#0F172A"));
        header.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("🏨 Crew Hotel Request in Base");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        title.setLayoutParams(tLp);
        header.addView(title);

        TextView closeBtn = new TextView(this);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#94A3B8"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        closeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        closeBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        closeBtn.setOnClickListener(v -> dialog.dismiss());
        header.addView(closeBtn);
        root.addView(header);

        // Content ScrollView
        ScrollView contentScroll = new ScrollView(this);
        contentScroll.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));

        // State Variables
        final String[] selectedBase = { defaultBase };
        java.util.Calendar cal = java.util.Calendar.getInstance();
        final int[] selMonth = { cal.get(java.util.Calendar.MONTH) + 1 };
        final int[] selDay = { cal.get(java.util.Calendar.DAY_OF_MONTH) };
        final String[] selectedReason = { "COMMUTER" };

        // 1. Crew Info Box
        LinearLayout crewInfoCard = new LinearLayout(this);
        crewInfoCard.setOrientation(LinearLayout.HORIZONTAL);
        crewInfoCard.setBackground(createRoundedDrawable("#F8FAFC", "#E2E8F0", dpToPx(8)));
        crewInfoCard.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        crewInfoCard.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView nameView = new TextView(this);
        nameView.setText("NAME: " + finalName);
        nameView.setTextColor(Color.parseColor("#0F172A"));
        nameView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        nameView.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        LinearLayout.LayoutParams nLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        nameView.setLayoutParams(nLp);
        crewInfoCard.addView(nameView);

        TextView empView = new TextView(this);
        empView.setText("EMP#: " + finalEmpId);
        empView.setTextColor(Color.parseColor("#0F172A"));
        empView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        empView.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        empView.setGravity(Gravity.END);
        crewInfoCard.addView(empView);
        content.addView(crewInfoCard);

        // 2. Base Selection (ORD, DFW, MIA, PHX)
        TextView baseLabel = new TextView(this);
        baseLabel.setText("1. SELECT LAYOVER BASE:");
        baseLabel.setTextColor(Color.parseColor("#475569"));
        baseLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        baseLabel.setTypeface(Typeface.DEFAULT_BOLD);
        baseLabel.setPadding(0, dpToPx(10), 0, dpToPx(4));
        content.addView(baseLabel);

        final String[] bases = {"ORD", "DFW", "MIA", "PHX"};
        final TextView[] baseBtns = new TextView[bases.length];
        LinearLayout baseRow = new LinearLayout(this);
        baseRow.setOrientation(LinearLayout.HORIZONTAL);
        baseRow.setPadding(0, 0, 0, dpToPx(6));

        final TextView previewTerminal = new TextView(this);

        final Runnable updateTerminal = () -> {
            String b = selectedBase[0];
            String baseChar = "C";
            if ("DFW".equalsIgnoreCase(b)) baseChar = "D";
            else if ("MIA".equalsIgnoreCase(b)) baseChar = "M";
            else if ("PHX".equalsIgnoreCase(b)) baseChar = "P";
            else baseChar = "C";

            String mStr = String.format(java.util.Locale.US, "%02d", selMonth[0]);
            String dStr = String.format(java.util.Locale.US, "%02d", selDay[0]);
            String r = selectedReason[0];

            String optCommuter = r.equals("COMMUTER") ? "<XXXXX" : "<.....";
            String optLost = r.equals("LOST_OVERNIGHT") ? "<XXXXX" : "<.....";
            String optCrit = r.equals("CRITICAL_COVERAGE") ? "<XXXXX" : "<.....";
            String optSp = r.equals("SP_REMOVAL") ? "<XXXXX" : "<.....";
            String optCancel = r.equals("CANCEL") ? "<XXXXX" : "<.....";

            String nameField = (finalName + ".........................").substring(0, 17);
            String empField = (finalEmpId + ".........................").substring(0, 11);

            String l1 = "IN PERSONAL MODE\nMAKE HI6 OR HI6A ENTRY\n\nRF 200" + baseChar + " HTL\nRF 200" + baseChar + " HTL\nHI0/HTL2/02ET/52AE/60AE/HTL3/MAE2/34AE/33AE/ES03/49AE/PHX1\n";
            String lBoxHeader = "*****************************************************************\n" +
                                "*                  CREW HOTEL REQUEST IN BASE                   *\n" +
                                "*****************************************************************\n";
            String lBlank = "*                                                               *\n";
            String lName = "*NAME <" + nameField + "       EMP#<" + empField + "                 *\n";
            String lBase = "*LAYOVER  " + String.format(java.util.Locale.US, "%-3s", b) + "          LAYOVER DATE <" + mStr + "/<" + dStr + "                     *\n";
            String lCommuter = "*" + optCommuter + "  COMMUTER HOTEL (1500 CHECK IN 1200 CHECK OUT)          *\n";
            String lLost = "*" + optLost + "  HOTEL DUE TO LOST OVERNIGHT FLYING                     *\n";
            String lCrit = "*" + optCrit + "  HOTEL DURING PUBLISHED CRITICAL COVERAGE (OT ONLY)     *\n";
            String lSp = "*" + optSp + "  SP REMOVAL                                             *\n";
            String lNotice = "*********NO SPECIAL REQUESTS FOR SPECIFIC HOTEL******************\n";
            String lCancel = "*" + optCancel + "  CANCEL HOTEL <■                                        *";

            previewTerminal.setText(l1 + lBoxHeader + lName + lBlank + lBase + lBlank + lCommuter + lLost + lCrit + lSp + lNotice + lCancel);
        };

        for (int i = 0; i < bases.length; i++) {
            final String bName = bases[i];
            final TextView bBtn = createKeypadButton(bName, bName.equals(selectedBase[0]) ? "#0284C7" : "#F1F5F9", bName.equals(selectedBase[0]) ? "#FFFFFF" : "#334155", null);
            baseBtns[i] = bBtn;
            bBtn.setOnClickListener(v -> {
                selectedBase[0] = bName;
                for (int j = 0; j < bases.length; j++) {
                    if (bases[j].equals(bName)) {
                        baseBtns[j].setBackground(createRoundedDrawable("#0284C7", "#0369A1", dpToPx(8)));
                        baseBtns[j].setTextColor(Color.WHITE);
                    } else {
                        baseBtns[j].setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
                        baseBtns[j].setTextColor(Color.parseColor("#334155"));
                    }
                }
                updateTerminal.run();
            });
            LinearLayout.LayoutParams bLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            if (i > 0) bLp.setMargins(dpToPx(4), 0, 0, 0);
            bBtn.setLayoutParams(bLp);
            baseRow.addView(bBtn);
        }
        content.addView(baseRow);

        // 3. Layover Date Picker
        TextView dateLabel = new TextView(this);
        dateLabel.setText("2. LAYOVER DATE:");
        dateLabel.setTextColor(Color.parseColor("#475569"));
        dateLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        dateLabel.setTypeface(Typeface.DEFAULT_BOLD);
        dateLabel.setPadding(0, dpToPx(8), 0, dpToPx(4));
        content.addView(dateLabel);

        final TextView dateBtn = new TextView(this);
        dateBtn.setText(String.format(java.util.Locale.US, "📅 Layover Date: %02d/%02d (Tap to Change)", selMonth[0], selDay[0]));
        dateBtn.setTextColor(Color.parseColor("#0F172A"));
        dateBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        dateBtn.setTypeface(Typeface.DEFAULT_BOLD);
        dateBtn.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        dateBtn.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        dateBtn.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams dtLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        dtLp.setMargins(0, 0, 0, dpToPx(10));
        dateBtn.setLayoutParams(dtLp);
        dateBtn.setOnClickListener(v -> {
            java.util.Calendar c = java.util.Calendar.getInstance();
            DatePickerDialog dpd = new DatePickerDialog(MainActivity.this, (DatePicker view, int year, int monthOfYear, int dayOfMonth) -> {
                selMonth[0] = monthOfYear + 1;
                selDay[0] = dayOfMonth;
                dateBtn.setText(String.format(java.util.Locale.US, "📅 Layover Date: %02d/%02d (Tap to Change)", selMonth[0], selDay[0]));
                updateTerminal.run();
            }, c.get(java.util.Calendar.YEAR), selMonth[0] - 1, selDay[0]);
            dpd.show();
        });
        content.addView(dateBtn);

        // 4. Hotel Request Reason (Radio selection)
        TextView reasonLabel = new TextView(this);
        reasonLabel.setText("3. SELECT REQUEST TYPE (CHOOSE ONE):");
        reasonLabel.setTextColor(Color.parseColor("#475569"));
        reasonLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        reasonLabel.setTypeface(Typeface.DEFAULT_BOLD);
        reasonLabel.setPadding(0, dpToPx(10), 0, dpToPx(4));
        content.addView(reasonLabel);

        final String[][] reasonDefs = {
            {"COMMUTER", "COMMUTER HOTEL (1500 CHECK IN 1200 CHECK OUT)", "CBA Sec 5"},
            {"LOST_OVERNIGHT", "HOTEL DUE TO LOST OVERNIGHT FLYING", "Irreg Ops"},
            {"CRITICAL_COVERAGE", "HOTEL DURING PUBLISHED CRITICAL COVERAGE", "OT Only"},
            {"SP_REMOVAL", "SP REMOVAL", "Removal"},
            {"CANCEL", "CANCEL HOTEL", "Cancel"}
        };

        final LinearLayout[] reasonViews = new LinearLayout[reasonDefs.length];
        for (int rIdx = 0; rIdx < reasonDefs.length; rIdx++) {
            final int index = rIdx;
            final String rKey = reasonDefs[rIdx][0];
            final String rTitle = reasonDefs[rIdx][1];
            final String rTag = reasonDefs[rIdx][2];

            final LinearLayout rCard = new LinearLayout(this);
            rCard.setOrientation(LinearLayout.VERTICAL);
            rCard.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
            LinearLayout.LayoutParams rLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rLp.setMargins(0, 0, 0, dpToPx(6));
            rCard.setLayoutParams(rLp);

            boolean isDefault = rKey.equals(selectedReason[0]);
            rCard.setBackground(createRoundedDrawable(isDefault ? "#F0F9FF" : "#FFFFFF", isDefault ? "#0284C7" : "#E2E8F0", dpToPx(8)));

            LinearLayout topRow = new LinearLayout(this);
            topRow.setOrientation(LinearLayout.HORIZONTAL);
            topRow.setGravity(Gravity.CENTER_VERTICAL);

            TextView rTv = new TextView(this);
            rTv.setText((isDefault ? "🔘 " : "⚪ ") + rTitle);
            rTv.setTextColor(Color.parseColor(isDefault ? "#0369A1" : "#1E293B"));
            rTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            rTv.setTypeface(Typeface.DEFAULT_BOLD);
            LinearLayout.LayoutParams rTvLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            rTv.setLayoutParams(rTvLp);
            topRow.addView(rTv);

            TextView tagTv = new TextView(this);
            tagTv.setText(rTag);
            tagTv.setTextColor(Color.parseColor("#64748B"));
            tagTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9.5f);
            tagTv.setTypeface(Typeface.DEFAULT_BOLD);
            tagTv.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(4)));
            tagTv.setPadding(dpToPx(6), dpToPx(2), dpToPx(6), dpToPx(2));
            topRow.addView(tagTv);
            rCard.addView(topRow);

            rCard.setOnClickListener(v -> {
                selectedReason[0] = rKey;
                for (int k = 0; k < reasonDefs.length; k++) {
                    boolean sel = reasonDefs[k][0].equals(rKey);
                    reasonViews[k].setBackground(createRoundedDrawable(sel ? "#F0F9FF" : "#FFFFFF", sel ? "#0284C7" : "#E2E8F0", dpToPx(8)));
                    LinearLayout row = (LinearLayout) reasonViews[k].getChildAt(0);
                    TextView textV = (TextView) row.getChildAt(0);
                    textV.setText((sel ? "🔘 " : "⚪ ") + reasonDefs[k][1]);
                    textV.setTextColor(Color.parseColor(sel ? "#0369A1" : "#1E293B"));
                }
                updateTerminal.run();
            });

            reasonViews[rIdx] = rCard;
            content.addView(rCard);
        }

        // 5. Notice Banner
        TextView noticeTv = new TextView(this);
        noticeTv.setText("⚠️ NO SPECIAL REQUESTS FOR SPECIFIC HOTEL");
        noticeTv.setTextColor(Color.parseColor("#92400E"));
        noticeTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        noticeTv.setTypeface(Typeface.DEFAULT_BOLD);
        noticeTv.setGravity(Gravity.CENTER);
        noticeTv.setBackground(createRoundedDrawable("#FEF3C7", "#FDE68A", dpToPx(6)));
        noticeTv.setPadding(dpToPx(8), dpToPx(6), dpToPx(8), dpToPx(6));
        LinearLayout.LayoutParams nLp2 = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        nLp2.setMargins(0, dpToPx(4), 0, dpToPx(8));
        noticeTv.setLayoutParams(nLp2);
        content.addView(noticeTv);

        // 6. Live Green DECS 3270 Terminal Preview
        TextView previewHeader = new TextView(this);
        previewHeader.setText("LIVE DECS TERMINAL SCREEN PREVIEW:");
        previewHeader.setTextColor(Color.parseColor("#475569"));
        previewHeader.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        previewHeader.setTypeface(Typeface.DEFAULT_BOLD);
        previewHeader.setPadding(0, dpToPx(2), 0, dpToPx(2));
        content.addView(previewHeader);

        previewTerminal.setTextColor(Color.parseColor("#00FF66"));
        HorizontalScrollView hScroll = new HorizontalScrollView(this);
        LinearLayout.LayoutParams hsLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hsLp.setMargins(0, 0, 0, dpToPx(4));
        hScroll.setLayoutParams(hsLp);
        hScroll.setBackground(createRoundedDrawable("#000000", "#1E293B", dpToPx(8)));
        hScroll.setPadding(dpToPx(10), dpToPx(10), dpToPx(10), dpToPx(10));

        previewTerminal.setTextColor(Color.parseColor("#00FF66"));
        previewTerminal.setBackgroundColor(Color.parseColor("#000000"));
        previewTerminal.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        previewTerminal.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        previewTerminal.setHorizontallyScrolling(true);
        previewTerminal.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        hScroll.addView(previewTerminal);
        content.addView(hScroll);

        updateTerminal.run();
        contentScroll.addView(content);
        root.addView(contentScroll);

        // Footer Action Buttons
        LinearLayout footer = new LinearLayout(this);
        footer.setOrientation(LinearLayout.HORIZONTAL);
        footer.setBackgroundColor(Color.parseColor("#F8FAFC"));
        footer.setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12));

        TextView copyBtn = new TextView(this);
        copyBtn.setText("📋 Copy Form");
        copyBtn.setTextColor(Color.parseColor("#334155"));
        copyBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        copyBtn.setTypeface(Typeface.DEFAULT_BOLD);
        copyBtn.setGravity(Gravity.CENTER);
        copyBtn.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        copyBtn.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        LinearLayout.LayoutParams cpLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        cpLp.setMargins(0, 0, dpToPx(6), 0);
        copyBtn.setLayoutParams(cpLp);
        copyBtn.setOnClickListener(v -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("DECS_Hotel_Request", previewTerminal.getText().toString()));
                Toast.makeText(MainActivity.this, "📋 Form copied to clipboard!", Toast.LENGTH_SHORT).show();
            }
        });
        footer.addView(copyBtn);

        TextView submitBtn = new TextView(this);
        submitBtn.setText("🚀 Submit in DECS");
        submitBtn.setTextColor(Color.WHITE);
        submitBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f);
        submitBtn.setTypeface(Typeface.DEFAULT_BOLD);
        submitBtn.setGravity(Gravity.CENTER);
        submitBtn.setBackground(createRoundedDrawable("#0284C7", "#0369A1", dpToPx(8)));
        submitBtn.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        LinearLayout.LayoutParams sbLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.4f);
        submitBtn.setLayoutParams(sbLp);
        submitBtn.setOnClickListener(v -> {
            String b = selectedBase[0];
            String baseChar = "C";
            if ("DFW".equalsIgnoreCase(b)) baseChar = "D";
            else if ("MIA".equalsIgnoreCase(b)) baseChar = "M";
            else if ("PHX".equalsIgnoreCase(b)) baseChar = "P";
            else baseChar = "C";

            dialog.dismiss();
            sendDirectDecsCommand("RF 200" + baseChar + " HTL^");
            Toast.makeText(MainActivity.this, "🏨 Hotel Request (" + b + " - RF 200" + baseChar + " HTL) Sent to DECS", Toast.LENGTH_LONG).show();
        });
        footer.addView(submitBtn);

        root.addView(footer);

        dialog.setContentView(root);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout((int) (getResources().getDisplayMetrics().widthPixels * 0.94), (int) (getResources().getDisplayMetrics().heightPixels * 0.85));
            dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
        }
        dialog.show();
    }

    private LinearLayout createButtonRow(KeyDef... keys) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        row.setPadding(0, dpToPx(2), 0, dpToPx(2));

        for (KeyDef k : keys) {
            TextView btn = createKeypadButton(k.label, k.color, "#FFFFFF", v -> {
                if (k.isStopMacro) {
                    executeStopCommand();
                } else if (k.isOpenTimePickupMacro) {
                    executeOpenTimePickupPopUpMacro();
                } else if (k.isHotelReqMacro) {
                    executeHotelRequestPopUpMacro();
                } else if (k.isOpenHssMacro) {
                    executeOpenSequenceHssPopUpMacro();
                } else if (k.isOpenTimeMacro) {
                    executeOpenTimePopUpMacro();
                } else if (k.isHssMacro) {
                    executeHssPairingPopUpMacro();
                } else if (k.isHihrMacro) {
                    executeHihrTurnbackPopUpMacro();
                } else if (k.isHiMacro) {
                    String cmdToRun = k.command;
                    if (cmdToRun != null && cmdToRun.startsWith("N6D")) {
                        cmdToRun = getDynamicN6dCommand();
                    }
                    executeAutonomousHiCapture(cmdToRun);
                } else if (k.isMultiStepMacro) {
                    executeMultiStepLoginMacro();
                } else if (k.sendImmediately) {
                    sendDirectDecsCommand(k.command);
                } else {
                    if (manualCommandInput != null) {
                        String current = manualCommandInput.getText().toString();
                        manualCommandInput.setText(current + k.command);
                        manualCommandInput.setSelection(manualCommandInput.getText().length());
                        manualCommandInput.requestFocus();
                    }
                }
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            lp.setMargins(dpToPx(2), dpToPx(2), dpToPx(2), dpToPx(2));
            btn.setLayoutParams(lp);
            row.addView(btn);
        }
        return row;
    }

    private void showDatePicker(EditText targetInput, Runnable onDatePicked) {
        java.util.Calendar cal = java.util.Calendar.getInstance();
        int initialYear = cal.get(java.util.Calendar.YEAR);
        int initialMonth = cal.get(java.util.Calendar.MONTH);
        int initialDay = cal.get(java.util.Calendar.DAY_OF_MONTH);

        String currentText = targetInput.getText().toString().trim().toUpperCase();
        String[] months = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};
        if (currentText.length() >= 5) {
            try {
                int day = Integer.parseInt(currentText.substring(0, 2));
                String mStr = currentText.substring(2, 5);
                for (int m = 0; m < months.length; m++) {
                    if (months[m].equalsIgnoreCase(mStr)) {
                        initialMonth = m;
                        initialDay = day;
                        break;
                    }
                }
            } catch (Exception ignored) {}
        }

        DatePickerDialog dpd = new DatePickerDialog(this, (DatePicker view, int year, int month, int dayOfMonth) -> {
            String formatted = String.format(java.util.Locale.US, "%02d%s", dayOfMonth, months[month]);
            targetInput.setText(formatted);
            if (onDatePicked != null) {
                onDatePicked.run();
            }
        }, initialYear, initialMonth, initialDay);

        dpd.getDatePicker().setMinDate(System.currentTimeMillis() - 1000);
        dpd.show();
    }

    private void executeOpenTimePopUpMacro() {
        runOnUiThread(this::renderOpenTimeModal);
    }

    private void renderOpenTimeModal() {
        final android.app.Dialog dialog = new android.app.Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        final LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#FFFFFF"));

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setBackgroundColor(Color.parseColor("#0369A1")); // Slate Blue
        header.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("✈️ N4D Open Time Trips (E75)");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        title.setLayoutParams(tLp);
        header.addView(title);

        TextView closeBtn = new TextView(this);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#BAE6FD"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        closeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        closeBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        closeBtn.setOnClickListener(v -> dialog.dismiss());
        header.addView(closeBtn);
        root.addView(header);

        // Content container
        ScrollView contentScroll = new ScrollView(this);
        contentScroll.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));

        // State variables
        final String[] selectedBase = {"ORD"};
        final String[] selectedSeat = {"CA"};

        // Calculate default dates
        java.util.Calendar cal = java.util.Calendar.getInstance();
        int curDay = cal.get(java.util.Calendar.DAY_OF_MONTH);
        int maxDaysInMonth = cal.getActualMaximum(java.util.Calendar.DAY_OF_MONTH);
        String[] months = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};
        String curMonth = months[cal.get(java.util.Calendar.MONTH)];

        final String todayStr = String.format(java.util.Locale.US, "%02d%s", curDay, curMonth);
        final String plus3Str = String.format(java.util.Locale.US, "%02d%s", Math.min(curDay + 3, maxDaysInMonth), curMonth);
        final String plus6Str = String.format(java.util.Locale.US, "%02d%s", Math.min(curDay + 6, maxDaysInMonth), curMonth);
        final String fullMonthStart = String.format(java.util.Locale.US, "01%s", curMonth);
        final String fullMonthEnd = String.format(java.util.Locale.US, "%02d%s", maxDaysInMonth, curMonth);

        // 1. Base Selection (ORD, DFW, MIA, PHX only)
        TextView baseLabel = new TextView(this);
        baseLabel.setText("1. SELECT CREW BASE:");
        baseLabel.setTextColor(Color.parseColor("#475569"));
        baseLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        baseLabel.setTypeface(Typeface.DEFAULT_BOLD);
        baseLabel.setPadding(0, 0, 0, dpToPx(4));
        content.addView(baseLabel);

        final String[] bases = {"ORD", "DFW", "MIA", "PHX"};
        final TextView[] baseBtns = new TextView[bases.length];

        LinearLayout baseRow = new LinearLayout(this);
        baseRow.setOrientation(LinearLayout.HORIZONTAL);
        baseRow.setPadding(0, 0, 0, dpToPx(10));

        final TextView cmdPreview = new TextView(this);
        final EditText startInput = new EditText(this);
        final EditText endInput = new EditText(this);

        final Runnable updatePreview = () -> {
            String b = selectedBase[0];
            String s = selectedSeat[0];
            String sD = startInput.getText().toString().trim().toUpperCase();
            String eD = endInput.getText().toString().trim().toUpperCase();
            if (sD.isEmpty()) sD = todayStr;
            if (eD.isEmpty()) eD = sD;
            cmdPreview.setText("Command: N4D/" + b + "/E75/" + s + "/" + sD + "/" + eD + "^");
        };

        for (int bIdx = 0; bIdx < bases.length; bIdx++) {
            final String bName = bases[bIdx];
            final TextView bBtn = createKeypadButton(bName, bName.equals("ORD") ? "#0284C7" : "#F1F5F9", bName.equals("ORD") ? "#FFFFFF" : "#334155", null);
            baseBtns[bIdx] = bBtn;
            bBtn.setOnClickListener(v -> {
                selectedBase[0] = bName;
                for (int j = 0; j < bases.length; j++) {
                    if (bases[j].equals(bName)) {
                        baseBtns[j].setBackground(createRoundedDrawable("#0284C7", "#0369A1", dpToPx(8)));
                        baseBtns[j].setTextColor(Color.WHITE);
                    } else {
                        baseBtns[j].setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
                        baseBtns[j].setTextColor(Color.parseColor("#334155"));
                    }
                }
                updatePreview.run();
            });

            LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            blp.setMargins(dpToPx(2), dpToPx(2), dpToPx(2), dpToPx(2));
            bBtn.setLayoutParams(blp);
            baseRow.addView(bBtn);
        }
        content.addView(baseRow);

        // 2. Date Range Selection (Calendar on click)
        TextView dateLabel = new TextView(this);
        dateLabel.setText("2. SELECT TRIP DATE RANGE (TAP TO OPEN CALENDAR):");
        dateLabel.setTextColor(Color.parseColor("#475569"));
        dateLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        dateLabel.setTypeface(Typeface.DEFAULT_BOLD);
        dateLabel.setPadding(0, 0, 0, dpToPx(4));
        content.addView(dateLabel);

        LinearLayout inputRow = new LinearLayout(this);
        inputRow.setOrientation(LinearLayout.HORIZONTAL);
        inputRow.setPadding(0, 0, 0, dpToPx(8));
        inputRow.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout startCol = new LinearLayout(this);
        startCol.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams sLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        startCol.setLayoutParams(sLp);

        TextView startLabel = new TextView(this);
        startLabel.setText("START DATE 📅");
        startLabel.setTextColor(Color.parseColor("#64748B"));
        startLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        startLabel.setTypeface(Typeface.DEFAULT_BOLD);
        startCol.addView(startLabel);

        startInput.setText(todayStr);
        startInput.setTextColor(Color.parseColor("#0F172A"));
        startInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        startInput.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        startInput.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        startInput.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        startInput.setFocusable(false);
        startInput.setClickable(true);
        startInput.setCursorVisible(false);
        startInput.setOnClickListener(v -> showDatePicker(startInput, updatePreview));
        startCol.addView(startInput);
        inputRow.addView(startCol);

        TextView arrow = new TextView(this);
        arrow.setText("➔");
        arrow.setTextColor(Color.parseColor("#94A3B8"));
        arrow.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        arrow.setPadding(dpToPx(8), dpToPx(12), dpToPx(8), 0);
        inputRow.addView(arrow);

        LinearLayout endCol = new LinearLayout(this);
        endCol.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams eLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        endCol.setLayoutParams(eLp);

        TextView endLabel = new TextView(this);
        endLabel.setText("END DATE 📅");
        endLabel.setTextColor(Color.parseColor("#64748B"));
        endLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        endLabel.setTypeface(Typeface.DEFAULT_BOLD);
        endCol.addView(endLabel);

        endInput.setText(todayStr);
        endInput.setTextColor(Color.parseColor("#0F172A"));
        endInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        endInput.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        endInput.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        endInput.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        endInput.setFocusable(false);
        endInput.setClickable(true);
        endInput.setCursorVisible(false);
        endInput.setOnClickListener(v -> showDatePicker(endInput, updatePreview));
        endCol.addView(endInput);
        inputRow.addView(endCol);

        content.addView(inputRow);

        // Date Preset Chips
        LinearLayout datePresetRow1 = new LinearLayout(this);
        datePresetRow1.setOrientation(LinearLayout.HORIZONTAL);
        datePresetRow1.setPadding(0, 0, 0, dpToPx(4));

        TextView chipToday = createKeypadButton("⚡ Today (" + todayStr + ")", "#0284C7", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(todayStr);
            updatePreview.run();
        });
        LinearLayout.LayoutParams d1Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        d1Lp.setMargins(0, 0, dpToPx(3), 0);
        chipToday.setLayoutParams(d1Lp);
        datePresetRow1.addView(chipToday);

        TextView chip3Days = createKeypadButton("📅 3-Day Window", "#334155", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(plus3Str);
            updatePreview.run();
        });
        LinearLayout.LayoutParams d2Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        d2Lp.setMargins(dpToPx(3), 0, 0, 0);
        chip3Days.setLayoutParams(d2Lp);
        datePresetRow1.addView(chip3Days);
        content.addView(datePresetRow1);

        LinearLayout datePresetRow2 = new LinearLayout(this);
        datePresetRow2.setOrientation(LinearLayout.HORIZONTAL);
        datePresetRow2.setPadding(0, 0, 0, dpToPx(8));

        TextView chip7Days = createKeypadButton("🗓️ 7-Day Week", "#4F46E5", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(plus6Str);
            updatePreview.run();
        });
        LinearLayout.LayoutParams d3Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        d3Lp.setMargins(0, 0, dpToPx(3), 0);
        chip7Days.setLayoutParams(d3Lp);
        datePresetRow2.addView(chip7Days);

        TextView chipMonth = createKeypadButton("📆 Rest of Month", "#334155", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(fullMonthEnd);
            updatePreview.run();
        });
        LinearLayout.LayoutParams d4Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        d4Lp.setMargins(dpToPx(3), 0, 0, 0);
        chipMonth.setLayoutParams(d4Lp);
        datePresetRow2.addView(chipMonth);
        content.addView(datePresetRow2);

        // 3. Seat Selection (CA / FO)
        TextView seatLabel = new TextView(this);
        seatLabel.setText("3. SEAT / POSITION:");
        seatLabel.setTextColor(Color.parseColor("#475569"));
        seatLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        seatLabel.setTypeface(Typeface.DEFAULT_BOLD);
        seatLabel.setPadding(0, 0, 0, dpToPx(4));
        content.addView(seatLabel);

        LinearLayout seatBtnRow = new LinearLayout(this);
        seatBtnRow.setOrientation(LinearLayout.HORIZONTAL);
        seatBtnRow.setPadding(0, 0, 0, dpToPx(10));

        final TextView caBtn = createKeypadButton("Captain (CA)", "#0F172A", "#FFFFFF", null);
        final TextView foBtn = createKeypadButton("First Officer (FO)", "#F1F5F9", "#334155", null);

        caBtn.setOnClickListener(v -> {
            selectedSeat[0] = "CA";
            caBtn.setBackground(createRoundedDrawable("#0F172A", "#0284C7", dpToPx(8)));
            caBtn.setTextColor(Color.WHITE);
            foBtn.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
            foBtn.setTextColor(Color.parseColor("#334155"));
            updatePreview.run();
        });

        foBtn.setOnClickListener(v -> {
            selectedSeat[0] = "FO";
            foBtn.setBackground(createRoundedDrawable("#0F172A", "#0284C7", dpToPx(8)));
            foBtn.setTextColor(Color.WHITE);
            caBtn.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
            caBtn.setTextColor(Color.parseColor("#334155"));
            updatePreview.run();
        });

        LinearLayout.LayoutParams sb1Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        sb1Lp.setMargins(0, 0, dpToPx(3), 0);
        caBtn.setLayoutParams(sb1Lp);

        LinearLayout.LayoutParams sb2Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        sb2Lp.setMargins(dpToPx(3), 0, 0, 0);
        foBtn.setLayoutParams(sb2Lp);

        seatBtnRow.addView(caBtn);
        seatBtnRow.addView(foBtn);
        content.addView(seatBtnRow);

        // Command Preview Box
        cmdPreview.setTextColor(Color.parseColor("#475569"));
        cmdPreview.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        cmdPreview.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        cmdPreview.setBackground(createRoundedDrawable("#F8FAFC", "#E2E8F0", dpToPx(8)));
        cmdPreview.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        cmdPreview.setText("Command: N4D/ORD/E75/CA/" + todayStr + "/" + todayStr + "^");

        android.text.TextWatcher watcher = new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override public void afterTextChanged(android.text.Editable s) {
                updatePreview.run();
            }
        };
        startInput.addTextChangedListener(watcher);
        endInput.addTextChangedListener(watcher);

        content.addView(cmdPreview);
        contentScroll.addView(content);
        root.addView(contentScroll);

        // Footer Action Buttons
        LinearLayout footer = new LinearLayout(this);
        footer.setOrientation(LinearLayout.HORIZONTAL);
        footer.setBackgroundColor(Color.parseColor("#F8FAFC"));
        footer.setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12));

        TextView cancelBtn = new TextView(this);
        cancelBtn.setText("Cancel");
        cancelBtn.setTextColor(Color.parseColor("#64748B"));
        cancelBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        cancelBtn.setTypeface(Typeface.DEFAULT_BOLD);
        cancelBtn.setGravity(Gravity.CENTER);
        cancelBtn.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        cancelBtn.setPadding(dpToPx(14), dpToPx(10), dpToPx(14), dpToPx(10));
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        clp.setMargins(0, 0, dpToPx(6), 0);
        cancelBtn.setLayoutParams(clp);
        cancelBtn.setOnClickListener(v -> dialog.dismiss());
        footer.addView(cancelBtn);

        TextView runBtn = new TextView(this);
        runBtn.setText("🚀 Pull Open Time");
        runBtn.setTextColor(Color.WHITE);
        runBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        runBtn.setTypeface(Typeface.DEFAULT_BOLD);
        runBtn.setGravity(Gravity.CENTER);
        runBtn.setBackground(createRoundedDrawable("#0284C7", "#0369A1", dpToPx(8)));
        runBtn.setPadding(dpToPx(14), dpToPx(10), dpToPx(14), dpToPx(10));
        LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.5f);
        runBtn.setLayoutParams(rlp);
        runBtn.setOnClickListener(v -> {
            String sD = startInput.getText().toString().trim().toUpperCase();
            String eD = endInput.getText().toString().trim().toUpperCase();
            if (sD.isEmpty()) sD = todayStr;
            if (eD.isEmpty()) eD = sD;
            String finalCmd = "N4D/" + selectedBase[0] + "/E75/" + selectedSeat[0] + "/" + sD + "/" + eD + "^";
            dialog.dismiss();
            executeAutonomousHiCapture(finalCmd);
        });
        footer.addView(runBtn);

        root.addView(footer);

        dialog.setContentView(root);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout((int) (getResources().getDisplayMetrics().widthPixels * 0.92), ViewGroup.LayoutParams.WRAP_CONTENT);
            dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
        }
        dialog.show();
    }

    private void executeHihrTurnbackPopUpMacro() {
        runOnUiThread(this::renderHihrTurnbackModal);
    }

    private void renderHihrTurnbackModal() {
        final android.app.Dialog dialog = new android.app.Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        final LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#FFFFFF"));

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setBackgroundColor(Color.parseColor("#881337")); // Deep rose
        header.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("🛡️ HIHR Reserve Turnback List");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        title.setLayoutParams(tLp);
        header.addView(title);

        TextView closeBtn = new TextView(this);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#FECDD3"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        closeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        closeBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        closeBtn.setOnClickListener(v -> dialog.dismiss());
        header.addView(closeBtn);
        root.addView(header);

        // Content Container
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));

        TextView instruction = new TextView(this);
        instruction.setText("Select a date range to query pilot turnbacks from DECS:");
        instruction.setTextColor(Color.parseColor("#475569"));
        instruction.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        instruction.setTypeface(Typeface.DEFAULT_BOLD);
        content.addView(instruction);

        // Calculate default dates
        java.util.Calendar cal = java.util.Calendar.getInstance();
        int curDay = cal.get(java.util.Calendar.DAY_OF_MONTH);
        int maxDaysInMonth = cal.getActualMaximum(java.util.Calendar.DAY_OF_MONTH);
        String[] months = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};
        String curMonth = months[cal.get(java.util.Calendar.MONTH)];
        
        final String todayStr = String.format(java.util.Locale.US, "%02d%s", curDay, curMonth);
        final String plus3Str = String.format(java.util.Locale.US, "%02d%s", Math.min(curDay + 3, maxDaysInMonth), curMonth);
        final String plus6Str = String.format(java.util.Locale.US, "%02d%s", Math.min(curDay + 6, maxDaysInMonth), curMonth);
        final String fullMonthStart = String.format(java.util.Locale.US, "01%s", curMonth);
        final String fullMonthEnd = String.format(java.util.Locale.US, "%02d%s", maxDaysInMonth, curMonth);

        // Date input fields
        LinearLayout inputRow = new LinearLayout(this);
        inputRow.setOrientation(LinearLayout.HORIZONTAL);
        inputRow.setPadding(0, dpToPx(10), 0, dpToPx(10));
        inputRow.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout startCol = new LinearLayout(this);
        startCol.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams sLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        startCol.setLayoutParams(sLp);

        TextView startLabel = new TextView(this);
        startLabel.setText("START DATE 📅");
        startLabel.setTextColor(Color.parseColor("#64748B"));
        startLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        startLabel.setTypeface(Typeface.DEFAULT_BOLD);
        startCol.addView(startLabel);

        final EditText startInput = new EditText(this);
        startInput.setText(todayStr);
        startInput.setTextColor(Color.parseColor("#0F172A"));
        startInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        startInput.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        startInput.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        startInput.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        startInput.setFocusable(false);
        startInput.setClickable(true);
        startInput.setCursorVisible(false);
        startCol.addView(startInput);
        inputRow.addView(startCol);

        TextView arrow = new TextView(this);
        arrow.setText("➔");
        arrow.setTextColor(Color.parseColor("#94A3B8"));
        arrow.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        arrow.setPadding(dpToPx(8), dpToPx(12), dpToPx(8), 0);
        inputRow.addView(arrow);

        LinearLayout endCol = new LinearLayout(this);
        endCol.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams eLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        endCol.setLayoutParams(eLp);

        TextView endLabel = new TextView(this);
        endLabel.setText("END DATE 📅");
        endLabel.setTextColor(Color.parseColor("#64748B"));
        endLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        endLabel.setTypeface(Typeface.DEFAULT_BOLD);
        endCol.addView(endLabel);

        final EditText endInput = new EditText(this);
        endInput.setText(todayStr);
        endInput.setTextColor(Color.parseColor("#0F172A"));
        endInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        endInput.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        endInput.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        endInput.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        endInput.setFocusable(false);
        endInput.setClickable(true);
        endInput.setCursorVisible(false);
        endCol.addView(endInput);
        inputRow.addView(endCol);

        final TextView cmdPreview = new TextView(this);

        final Runnable updateTurnbackPreview = () -> {
            String sD = startInput.getText().toString().trim().toUpperCase();
            String eD = endInput.getText().toString().trim().toUpperCase();
            if (sD.isEmpty()) sD = todayStr;
            if (eD.isEmpty() || eD.equals(sD)) {
                cmdPreview.setText("Command: HIHR/" + sD + "^");
            } else {
                cmdPreview.setText("Command: HIHR/" + sD + "/" + eD + "^");
            }
        };

        startInput.setOnClickListener(v -> showDatePicker(startInput, updateTurnbackPreview));
        endInput.setOnClickListener(v -> showDatePicker(endInput, updateTurnbackPreview));

        content.addView(inputRow);

        // Quick Preset Chips Header
        TextView presetsHeader = new TextView(this);
        presetsHeader.setText("QUICK PRESETS:");
        presetsHeader.setTextColor(Color.parseColor("#64748B"));
        presetsHeader.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        presetsHeader.setTypeface(Typeface.DEFAULT_BOLD);
        presetsHeader.setPadding(0, dpToPx(4), 0, dpToPx(4));
        content.addView(presetsHeader);

        // Preset Chips Grid
        LinearLayout presetRow1 = new LinearLayout(this);
        presetRow1.setOrientation(LinearLayout.HORIZONTAL);
        presetRow1.setPadding(0, dpToPx(2), 0, dpToPx(4));

        TextView chipToday = createKeypadButton("⚡ Today (" + todayStr + ")", "#E11D48", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(todayStr);
        });
        LinearLayout.LayoutParams c1Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        c1Lp.setMargins(0, 0, dpToPx(4), 0);
        chipToday.setLayoutParams(c1Lp);
        presetRow1.addView(chipToday);

        TextView chip3Days = createKeypadButton("📅 3-Day Window", "#0284C7", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(plus3Str);
        });
        LinearLayout.LayoutParams c2Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        c2Lp.setMargins(dpToPx(4), 0, 0, 0);
        chip3Days.setLayoutParams(c2Lp);
        presetRow1.addView(chip3Days);

        content.addView(presetRow1);

        LinearLayout presetRow2 = new LinearLayout(this);
        presetRow2.setOrientation(LinearLayout.HORIZONTAL);
        presetRow2.setPadding(0, dpToPx(2), 0, dpToPx(6));

        TextView chip7Days = createKeypadButton("🗓️ 7-Day Week", "#4F46E5", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(plus6Str);
        });
        LinearLayout.LayoutParams c3Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        c3Lp.setMargins(0, 0, dpToPx(4), 0);
        chip7Days.setLayoutParams(c3Lp);
        presetRow2.addView(chip7Days);

        TextView chipMonth = createKeypadButton("📆 Rest of Month", "#334155", "#FFFFFF", v -> {
            startInput.setText(todayStr);
            endInput.setText(fullMonthEnd);
            updateTurnbackPreview.run();
        });
        LinearLayout.LayoutParams c4Lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        c4Lp.setMargins(dpToPx(4), 0, 0, 0);
        chipMonth.setLayoutParams(c4Lp);
        presetRow2.addView(chipMonth);

        content.addView(presetRow2);

        // Command Preview Box
        cmdPreview.setTextColor(Color.parseColor("#475569"));
        cmdPreview.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        cmdPreview.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        cmdPreview.setBackground(createRoundedDrawable("#F8FAFC", "#E2E8F0", dpToPx(8)));
        cmdPreview.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        cmdPreview.setText("Command: HIHR/" + todayStr + "^");

        android.text.TextWatcher watcher = new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override public void afterTextChanged(android.text.Editable s) {
                String sD = startInput.getText().toString().trim().toUpperCase();
                String eD = endInput.getText().toString().trim().toUpperCase();
                if (eD.isEmpty() || eD.equals(sD)) {
                    cmdPreview.setText("Command: HIHR/" + sD + "^");
                } else {
                    cmdPreview.setText("Command: HIHR/" + sD + "/" + eD + "^");
                }
            }
        };
        startInput.addTextChangedListener(watcher);
        endInput.addTextChangedListener(watcher);

        content.addView(cmdPreview);
        root.addView(content);

        // Footer Action Buttons
        LinearLayout footer = new LinearLayout(this);
        footer.setOrientation(LinearLayout.HORIZONTAL);
        footer.setBackgroundColor(Color.parseColor("#F8FAFC"));
        footer.setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12));

        TextView cancelBtn = new TextView(this);
        cancelBtn.setText("Cancel");
        cancelBtn.setTextColor(Color.parseColor("#64748B"));
        cancelBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        cancelBtn.setTypeface(Typeface.DEFAULT_BOLD);
        cancelBtn.setGravity(Gravity.CENTER);
        cancelBtn.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(8)));
        cancelBtn.setPadding(dpToPx(14), dpToPx(10), dpToPx(14), dpToPx(10));
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        clp.setMargins(0, 0, dpToPx(6), 0);
        cancelBtn.setLayoutParams(clp);
        cancelBtn.setOnClickListener(v -> dialog.dismiss());
        footer.addView(cancelBtn);

        TextView runBtn = new TextView(this);
        runBtn.setText("🚀 Run HIHR");
        runBtn.setTextColor(Color.WHITE);
        runBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        runBtn.setTypeface(Typeface.DEFAULT_BOLD);
        runBtn.setGravity(Gravity.CENTER);
        runBtn.setBackground(createRoundedDrawable("#E11D48", "#BE123C", dpToPx(8)));
        runBtn.setPadding(dpToPx(14), dpToPx(10), dpToPx(14), dpToPx(10));
        LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.5f);
        runBtn.setLayoutParams(rlp);
        runBtn.setOnClickListener(v -> {
            String sD = startInput.getText().toString().trim().toUpperCase();
            String eD = endInput.getText().toString().trim().toUpperCase();
            if (sD.isEmpty()) sD = todayStr;
            String finalCmd;
            if (eD.isEmpty() || eD.equals(sD)) {
                finalCmd = "HIHR/" + sD + "^";
            } else {
                finalCmd = "HIHR/" + sD + "/" + eD + "^";
            }
            dialog.dismiss();
            executeAutonomousHiCapture(finalCmd);
        });
        footer.addView(runBtn);

        root.addView(footer);

        dialog.setContentView(root);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout((int) (getResources().getDisplayMetrics().widthPixels * 0.92), ViewGroup.LayoutParams.WRAP_CONTENT);
            dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
        }
        dialog.show();
    }

    private static class HssSequenceItem {
        String seqNum;
        String startDate;
        String endDate;
        String dateRangeText;
        String monthKey; // "PRIOR", "CURRENT", "FUTURE"
        String cmdDate;  // e.g. "20AUG"
        String duration;
        String base;
        String credit;
        String layovers;
        String seat;     // "CA" or "FO"

        HssSequenceItem(String seqNum, String startDate, String endDate, String dateRangeText, String monthKey, String cmdDate, String duration, String base, String credit, String layovers, String seat) {
            this.seqNum = seqNum;
            this.startDate = startDate;
            this.endDate = endDate;
            this.dateRangeText = dateRangeText;
            this.monthKey = monthKey;
            this.cmdDate = cmdDate;
            this.duration = duration;
            this.base = base;
            this.credit = credit;
            this.layovers = layovers;
            this.seat = (seat != null && !seat.isEmpty()) ? seat : "CA";
        }
    }

    private void executeHssPairingPopUpMacro() {
        String triggerJs = "if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('openHssSequencesModal')); }";
        if (portalWebView != null) {
            portalWebView.evaluateJavascript(triggerJs, null);
        }

        WebView mainWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (mainWebView == null) {
            Toast.makeText(this, "Opening HSS Modal...", Toast.LENGTH_SHORT).show();
            return;
        }

        String fetchJs = "(function() { " +
            "  try { " +
            "    if (window.__CREW_STORE__) { " +
            "      return JSON.stringify(window.__CREW_STORE__.getState().sequences || []); " +
            "    } " +
            "    var raw = localStorage.getItem('crewschedule-store'); " +
            "    if (raw) { " +
            "      var p = JSON.parse(raw); " +
            "      if (p && p.state && p.state.sequences) return JSON.stringify(p.state.sequences); " +
            "    } " +
            "  } catch(e) {} " +
            "  return '[]'; " +
            "})()";

        mainWebView.evaluateJavascript(fetchJs, new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String rawJson) {
                runOnUiThread(() -> renderCalendarHssModal(rawJson));
            }
        });
    }

    private void renderCalendarHssModal(String rawJson) {
        String jsonStr = rawJson;
        if (jsonStr == null || jsonStr.equals("null") || jsonStr.trim().isEmpty()) {
            jsonStr = "[]";
        }
        if (jsonStr.startsWith("\"") && jsonStr.endsWith("\"") && jsonStr.length() > 1) {
            try {
                jsonStr = new JSONTokener(jsonStr).nextValue().toString();
            } catch (Exception ignored) {}
        }

        final List<HssSequenceItem> allSequences = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(jsonStr);
            final String[] months = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};

            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String seq = obj.optString("sequenceNumber", "").trim();
                if (seq.isEmpty()) continue;

                // Skip dropped sequences - only show live sequences
                boolean isDropped = obj.optBoolean("isDropped", false) || obj.optBoolean("isDtsDropped", false) || obj.optBoolean("dropped", false);
                String status = obj.optString("status", "");
                String statusTag = obj.optString("statusTag", "");
                if (isDropped || status.equalsIgnoreCase("DROPPED") || statusTag.equalsIgnoreCase("DROP") || statusTag.equalsIgnoreCase("DROPPED")) {
                    continue;
                }

                String sDate = obj.optString("startDate", "");
                String eDate = obj.optString("endDate", sDate);
                String base = obj.optString("base", "ORD");
                if (base.isEmpty()) base = "ORD";

                // Format Command Date (e.g. 20AUG)
                String cmdDate = "";
                String monthKey = "CURRENT";
                if (!sDate.isEmpty() && sDate.contains("-")) {
                    String[] parts = sDate.split("-");
                    if (parts.length == 3) {
                        int m = Integer.parseInt(parts[1]);
                        String day = parts[2];
                        if (day.length() == 1) day = "0" + day;
                        String mStr = (m >= 1 && m <= 12) ? months[m - 1] : "AUG";
                        cmdDate = day + mStr;

                        // Categorize into Prior, Current, Future based on month 7, 8, 9
                        if (m < 8) {
                            monthKey = "PRIOR";
                        } else if (m > 8) {
                            monthKey = "FUTURE";
                        } else {
                            monthKey = "CURRENT";
                        }
                    }
                }

                // Credit
                String creditStr = "";
                if (obj.has("totalCreditMinutes")) {
                    int mins = obj.optInt("totalCreditMinutes", 0);
                    if (mins > 0) {
                        creditStr = String.format(java.util.Locale.US, "%.1fh Credit", mins / 60.0);
                    }
                } else if (obj.has("creditHours")) {
                    creditStr = obj.optString("creditHours") + "h Credit";
                }

                // Layovers
                String layovers = "";
                if (obj.has("layoverCities")) {
                    JSONArray lc = obj.optJSONArray("layoverCities");
                    if (lc != null) {
                        StringBuilder sb = new StringBuilder();
                        for (int k = 0; k < lc.length(); k++) {
                            if (k > 0) sb.append(" • ");
                            sb.append(lc.optString(k));
                        }
                        layovers = sb.toString();
                    }
                }

                // Date Range Text
                String dateRangeText = sDate;
                if (!eDate.isEmpty() && !eDate.equals(sDate)) {
                    dateRangeText = sDate + " ➔ " + eDate;
                }

                // Duration
                int days = obj.optInt("dutyPeriodsCount", obj.optInt("daysCount", 0));
                String durText = days > 0 ? (days + "-Day Trip") : "Pairing";

                // Seat / Rank (CA, FO, FA)
                String rank = obj.optString("rank", "");
                String role = obj.optString("role", "");
                String seatVal = obj.optString("seat", "");
                String position = obj.optString("position", "");
                String combined = (rank + " " + role + " " + seatVal + " " + position).toUpperCase();
                
                String seat = "CA";
                if (combined.contains("FA") || combined.contains("FLIGHT ATTENDANT") || combined.contains("ATTENDANT") || combined.contains("FLT ATT")) {
                    seat = "FA";
                } else if (combined.contains("FO") || combined.contains("F/O") || combined.contains("FIRST OFFICER") || combined.contains("SIC")) {
                    seat = "FO";
                } else {
                    seat = "CA";
                }

                allSequences.add(new HssSequenceItem(seq, sDate, eDate, dateRangeText, monthKey, cmdDate, durText, base, creditStr, layovers, seat));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        final android.app.Dialog dialog = new android.app.Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        final LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#FFFFFF"));

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setBackgroundColor(Color.parseColor("#0F172A"));
        header.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("✈️ HSS Pairings (From Calendar)");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        title.setLayoutParams(tLp);
        header.addView(title);

        TextView closeBtn = new TextView(this);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#94A3B8"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        closeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        closeBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        closeBtn.setOnClickListener(v -> dialog.dismiss());
        header.addView(closeBtn);
        root.addView(header);

        // Multi-Selection State (Stores sequence numbers)
        final Set<String> selectedSeqs = new LinkedHashSet<>();

        // 3-Month Segmented Tabs (Prior, Current, Future)
        final LinearLayout tabRow = new LinearLayout(this);
        tabRow.setOrientation(LinearLayout.HORIZONTAL);
        tabRow.setBackgroundColor(Color.parseColor("#F1F5F9"));
        tabRow.setPadding(dpToPx(8), dpToPx(8), dpToPx(8), dpToPx(8));

        final String[] monthKeys = {"PRIOR", "CURRENT", "FUTURE"};
        final String[] monthLabels = {"🗓️ Jul (Prior)", "⭐ Aug (Current)", "🚀 Sep (Future)"};
        final TextView[] tabBtns = new TextView[3];
        final String[] activeTabKey = {"CURRENT"};

        // Selection Control Bar (Select All / None / Count)
        final LinearLayout selectBar = new LinearLayout(this);
        selectBar.setOrientation(LinearLayout.HORIZONTAL);
        selectBar.setBackgroundColor(Color.parseColor("#F8FAFC"));
        selectBar.setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8));
        selectBar.setGravity(Gravity.CENTER_VERTICAL);

        final TextView selectAllBtn = new TextView(this);
        selectAllBtn.setText("☑ Select All");
        selectAllBtn.setTextColor(Color.parseColor("#4338CA"));
        selectAllBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
        selectAllBtn.setTypeface(Typeface.DEFAULT_BOLD);
        selectAllBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        selectAllBtn.setBackground(createRoundedDrawable("#EEF2FF", "#C7D2FE", dpToPx(6)));
        selectBar.addView(selectAllBtn);

        final TextView deselectBtn = new TextView(this);
        deselectBtn.setText("☐ Clear");
        deselectBtn.setTextColor(Color.parseColor("#64748B"));
        deselectBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
        deselectBtn.setTypeface(Typeface.DEFAULT_BOLD);
        deselectBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        LinearLayout.LayoutParams dsLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        dsLp.setMargins(dpToPx(6), 0, 0, 0);
        deselectBtn.setLayoutParams(dsLp);
        selectBar.addView(deselectBtn);

        final TextView selCountText = new TextView(this);
        selCountText.setText("0 Selected");
        selCountText.setTextColor(Color.parseColor("#334155"));
        selCountText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
        selCountText.setTypeface(Typeface.DEFAULT_BOLD);
        selCountText.setGravity(Gravity.END);
        LinearLayout.LayoutParams scLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        selCountText.setLayoutParams(scLp);
        selectBar.addView(selCountText);

        final LinearLayout cardsContainer = new LinearLayout(this);
        cardsContainer.setOrientation(LinearLayout.VERTICAL);
        cardsContainer.setPadding(dpToPx(12), dpToPx(8), dpToPx(12), dpToPx(12));

        // Sticky Bottom Batch Pull Action Bar
        final LinearLayout bottomBatchBar = new LinearLayout(this);
        bottomBatchBar.setOrientation(LinearLayout.VERTICAL);
        bottomBatchBar.setBackgroundColor(Color.parseColor("#0F172A"));
        bottomBatchBar.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(14));

        final TextView batchPullBtn = new TextView(this);
        batchPullBtn.setTextColor(Color.WHITE);
        batchPullBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        batchPullBtn.setTypeface(Typeface.DEFAULT_BOLD);
        batchPullBtn.setGravity(Gravity.CENTER);
        batchPullBtn.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));
        batchPullBtn.setBackground(createRoundedDrawable("#0D9488", "#0F766E", dpToPx(10)));
        bottomBatchBar.addView(batchPullBtn);

        final Runnable updateBatchBar = () -> {
            int selectedCount = 0;
            int totalInMonth = 0;
            for (HssSequenceItem it : allSequences) {
                if (it.monthKey.equals(activeTabKey[0])) {
                    totalInMonth++;
                    if (selectedSeqs.contains(it.seqNum)) {
                        selectedCount++;
                    }
                }
            }

            selCountText.setText(selectedCount + " / " + totalInMonth + " Selected");
            if (selectedCount > 0) {
                batchPullBtn.setText("⚡ Batch Pull (" + selectedCount + ") Selected Pairings on WebSabre");
                batchPullBtn.setBackground(createRoundedDrawable("#0D9488", "#0F766E", dpToPx(10)));
                batchPullBtn.setEnabled(true);
            } else if (totalInMonth > 0) {
                batchPullBtn.setText("⚡ Pull All (" + totalInMonth + ") in Month from WebSabre");
                batchPullBtn.setBackground(createRoundedDrawable("#4338CA", "#3730A3", dpToPx(10)));
                batchPullBtn.setEnabled(true);
            } else {
                batchPullBtn.setText("No sequences in this month");
                batchPullBtn.setBackground(createRoundedDrawable("#64748B", "#475569", dpToPx(10)));
                batchPullBtn.setEnabled(false);
            }
        };

        final Runnable renderCards = () -> {
            cardsContainer.removeAllViews();
            int count = 0;
            for (final HssSequenceItem item : allSequences) {
                if (!item.monthKey.equals(activeTabKey[0])) continue;
                count++;

                final boolean isSelected = selectedSeqs.contains(item.seqNum);

                // Card Box
                LinearLayout card = new LinearLayout(MainActivity.this);
                card.setOrientation(LinearLayout.VERTICAL);
                if (isSelected) {
                    card.setBackground(createRoundedDrawable("#EEF2FF", "#4338CA", dpToPx(12)));
                } else {
                    card.setBackground(createRoundedDrawable("#FFFFFF", "#E2E8F0", dpToPx(12)));
                }
                card.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));
                LinearLayout.LayoutParams cLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                cLp.setMargins(0, dpToPx(4), 0, dpToPx(10));
                card.setLayoutParams(cLp);

                // Top Row: Checkbox Badge + SEQ # + Duration + Credit
                LinearLayout topRow = new LinearLayout(MainActivity.this);
                topRow.setOrientation(LinearLayout.HORIZONTAL);
                topRow.setGravity(Gravity.CENTER_VERTICAL);

                // Checkbox pill
                TextView chkBadge = new TextView(MainActivity.this);
                chkBadge.setText(isSelected ? "✓ SELECTED" : "○ SELECT");
                chkBadge.setTextColor(isSelected ? Color.WHITE : Color.parseColor("#475569"));
                chkBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
                chkBadge.setTypeface(Typeface.DEFAULT_BOLD);
                if (isSelected) {
                    chkBadge.setBackground(createRoundedDrawable("#4338CA", "#3730A3", dpToPx(6)));
                } else {
                    chkBadge.setBackground(createRoundedDrawable("#F1F5F9", "#CBD5E1", dpToPx(6)));
                }
                chkBadge.setPadding(dpToPx(6), dpToPx(3), dpToPx(6), dpToPx(3));
                topRow.addView(chkBadge);

                TextView seqBadge = new TextView(MainActivity.this);
                seqBadge.setText(" SEQ #" + item.seqNum);
                seqBadge.setTextColor(Color.parseColor("#4338CA"));
                seqBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
                seqBadge.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
                LinearLayout.LayoutParams sbLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                sbLp.setMargins(dpToPx(6), 0, 0, 0);
                seqBadge.setLayoutParams(sbLp);
                topRow.addView(seqBadge);

                TextView durBadge = new TextView(MainActivity.this);
                durBadge.setText(" " + item.duration + " • " + item.base);
                durBadge.setTextColor(Color.parseColor("#64748B"));
                durBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
                durBadge.setTypeface(Typeface.DEFAULT_BOLD);
                LinearLayout.LayoutParams dLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
                dLp.setMargins(dpToPx(4), 0, 0, 0);
                durBadge.setLayoutParams(dLp);
                topRow.addView(durBadge);

                if (!item.credit.isEmpty()) {
                    TextView crdBadge = new TextView(MainActivity.this);
                    crdBadge.setText(item.credit);
                    crdBadge.setTextColor(Color.parseColor("#0F172A"));
                    crdBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                    crdBadge.setTypeface(Typeface.DEFAULT_BOLD);
                    topRow.addView(crdBadge);
                }
                card.addView(topRow);

                // Dates & Layovers
                TextView dateText = new TextView(MainActivity.this);
                dateText.setText("📅 " + item.dateRangeText + (item.layovers.isEmpty() ? "" : ("  |  📍 " + item.layovers)));
                dateText.setTextColor(Color.parseColor("#334155"));
                dateText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                dateText.setTypeface(Typeface.DEFAULT_BOLD);
                LinearLayout.LayoutParams dtLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                dtLp.setMargins(0, dpToPx(6), 0, dpToPx(6));
                dateText.setLayoutParams(dtLp);
                card.addView(dateText);

                // Toggle Selection on Card Click
                card.setClickable(true);
                card.setFocusable(true);
                card.setOnClickListener(v -> {
                    if (selectedSeqs.contains(item.seqNum)) {
                        selectedSeqs.remove(item.seqNum);
                    } else {
                        selectedSeqs.add(item.seqNum);
                    }
                    updateBatchBar.run();
                    for (int cIdx = 0; cIdx < cardsContainer.getChildCount(); cIdx++) {
                        View ch = cardsContainer.getChildAt(cIdx);
                        if (ch.getTag() != null && ch.getTag().equals(item.seqNum)) {
                            boolean nowSel = selectedSeqs.contains(item.seqNum);
                            ch.setBackground(createRoundedDrawable(nowSel ? "#EEF2FF" : "#FFFFFF", nowSel ? "#4338CA" : "#E2E8F0", dpToPx(12)));
                            LinearLayout tr = (LinearLayout) ((ViewGroup) ch).getChildAt(0);
                            TextView cb = (TextView) tr.getChildAt(0);
                            cb.setText(nowSel ? "✓ SELECTED" : "○ SELECT");
                            cb.setTextColor(nowSel ? Color.WHITE : Color.parseColor("#475569"));
                            cb.setBackground(createRoundedDrawable(nowSel ? "#4338CA" : "#F1F5F9", nowSel ? "#3730A3" : "#CBD5E1", dpToPx(6)));
                        }
                    }
                });
                card.setTag(item.seqNum);

                // Individual 1-Tap Pull Action Button
                TextView execBtn = new TextView(MainActivity.this);
                String cmd = "HSS/" + item.seat + "/" + item.seqNum + (item.cmdDate.isEmpty() ? "" : ("/" + item.cmdDate));
                execBtn.setText("⚡ Pull " + cmd);
                execBtn.setTextColor(Color.WHITE);
                execBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
                execBtn.setTypeface(Typeface.DEFAULT_BOLD);
                execBtn.setGravity(Gravity.CENTER);
                execBtn.setBackground(createRoundedDrawable("#0D9488", "#0F766E", dpToPx(8)));
                execBtn.setPadding(dpToPx(8), dpToPx(8), dpToPx(8), dpToPx(8));
                LinearLayout.LayoutParams exLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                exLp.setMargins(0, dpToPx(4), 0, 0);
                execBtn.setLayoutParams(exLp);
                execBtn.setOnClickListener(v -> {
                    executeAutonomousHssCapture(cmd);
                    dialog.dismiss();
                });
                card.addView(execBtn);

                cardsContainer.addView(card);
            }

            if (count == 0) {
                TextView emptyTv = new TextView(MainActivity.this);
                emptyTv.setText("No calendar sequences found for this month.");
                emptyTv.setTextColor(Color.parseColor("#94A3B8"));
                emptyTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                emptyTv.setGravity(Gravity.CENTER);
                emptyTv.setPadding(dpToPx(16), dpToPx(32), dpToPx(16), dpToPx(32));
                cardsContainer.addView(emptyTv);
            }

            updateBatchBar.run();
        };

        // Select All Button Handler
        selectAllBtn.setOnClickListener(v -> {
            for (HssSequenceItem it : allSequences) {
                if (it.monthKey.equals(activeTabKey[0])) {
                    selectedSeqs.add(it.seqNum);
                }
            }
            renderCards.run();
        });

        // Deselect All Button Handler
        deselectBtn.setOnClickListener(v -> {
            for (HssSequenceItem it : allSequences) {
                if (it.monthKey.equals(activeTabKey[0])) {
                    selectedSeqs.remove(it.seqNum);
                }
            }
            renderCards.run();
        });

        // Month Tabs Construction
        for (int i = 0; i < 3; i++) {
            final int idx = i;
            final String k = monthKeys[i];
            TextView tab = new TextView(this);
            tab.setText(monthLabels[i]);
            tab.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            tab.setTypeface(Typeface.DEFAULT_BOLD);
            tab.setGravity(Gravity.CENTER);
            tab.setClickable(true);
            tab.setFocusable(true);
            tab.setPadding(dpToPx(8), dpToPx(12), dpToPx(8), dpToPx(12));
            LinearLayout.LayoutParams tL = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            tL.setMargins(dpToPx(3), 0, dpToPx(3), 0);
            tab.setLayoutParams(tL);

            if (k.equals(activeTabKey[0])) {
                tab.setTextColor(Color.WHITE);
                tab.setBackground(createRoundedDrawable("#4338CA", "#3730A3", dpToPx(8)));
            } else {
                tab.setTextColor(Color.parseColor("#475569"));
                tab.setBackground(createRoundedDrawable("#FFFFFF", "#CBD5E1", dpToPx(8)));
            }

            tab.setOnClickListener(v -> {
                activeTabKey[0] = k;
                for (int j = 0; j < 3; j++) {
                    if (monthKeys[j].equals(activeTabKey[0])) {
                        tabBtns[j].setTextColor(Color.WHITE);
                        tabBtns[j].setBackground(createRoundedDrawable("#4338CA", "#3730A3", dpToPx(8)));
                    } else {
                        tabBtns[j].setTextColor(Color.parseColor("#475569"));
                        tabBtns[j].setBackground(createRoundedDrawable("#FFFFFF", "#CBD5E1", dpToPx(8)));
                    }
                }
                renderCards.run();
            });

            tabBtns[i] = tab;
            tabRow.addView(tab);
        }
        root.addView(tabRow);
        root.addView(selectBar);

        // ScrollView for Cards
        ScrollView sv = new ScrollView(this);
        sv.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
        sv.addView(cardsContainer);
        root.addView(sv);

        // Batch Pull Button Click Handler (Executes full TAFB/MD sequential capture for each HSS)
        batchPullBtn.setOnClickListener(v -> {
            final List<String> toPullCmds = new ArrayList<>();
            for (HssSequenceItem it : allSequences) {
                if (it.monthKey.equals(activeTabKey[0])) {
                    if (selectedSeqs.contains(it.seqNum) || selectedSeqs.isEmpty()) {
                        String cmd = "HSS/" + it.seat + "/" + it.seqNum + (it.cmdDate.isEmpty() ? "" : ("/" + it.cmdDate));
                        toPullCmds.add(cmd);
                    }
                }
            }

            if (toPullCmds.isEmpty()) {
                Toast.makeText(MainActivity.this, "No sequences to pull.", Toast.LENGTH_SHORT).show();
                return;
            }

            executeBatchHssCapture(toPullCmds);
            dialog.dismiss();
        });

        root.addView(bottomBatchBar);

        // Initial Render
        renderCards.run();

        dialog.setContentView(root);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, (int) (getResources().getDisplayMetrics().heightPixels * 0.82));
            dialog.getWindow().setGravity(Gravity.BOTTOM);
        }
        dialog.show();
    }

    private static class OpenHssSequenceItem {
        String seqNum;
        String startDate;
        String endDate;
        String dateRangeText;
        String cmdDate; // e.g. "19AUG"
        String duration;
        String base;
        String seat;
        String credit;
        String layovers;
        String legs;
        boolean isDropBoard;
        boolean isLegal;
        String conflictReason;

        OpenHssSequenceItem(String seqNum, String startDate, String endDate, String dateRangeText, String cmdDate, String duration, String base, String seat, String credit, String layovers, String legs, boolean isDropBoard, boolean isLegal, String conflictReason) {
            this.seqNum = seqNum;
            this.startDate = startDate;
            this.endDate = endDate;
            this.dateRangeText = dateRangeText;
            this.cmdDate = cmdDate;
            this.duration = duration;
            this.base = base;
            this.seat = seat;
            this.credit = credit;
            this.layovers = layovers;
            this.legs = legs;
            this.isDropBoard = isDropBoard;
            this.isLegal = isLegal;
            this.conflictReason = conflictReason;
        }
    }

    private void executeOpenSequenceHssPopUpMacro() {
        WebView mainWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (mainWebView == null) {
            Toast.makeText(this, "Loading Open Time Sequences...", Toast.LENGTH_SHORT).show();
            return;
        }

        String fetchJs = "(function() { " +
            "  try { " +
            "    if (window.__GET_EVALUATED_OPEN_SEQUENCES__) { " +
            "      return JSON.stringify({ items: window.__GET_EVALUATED_OPEN_SEQUENCES__() }); " +
            "    } " +
            "    var store = window.__CREW_STORE__ ? window.__CREW_STORE__.getState() : null; " +
            "    var openSeqs = []; " +
            "    var activeSeqs = []; " +
            "    if (store) { " +
            "      openSeqs = store.openSequences || []; " +
            "      activeSeqs = store.sequences || []; " +
            "    } else { " +
            "      var rawOpen = localStorage.getItem('crewschedule_opensequences'); " +
            "      if (rawOpen) openSeqs = JSON.parse(rawOpen); " +
            "      var rawStore = localStorage.getItem('crewschedule-store'); " +
            "      if (rawStore) { " +
            "        var p = JSON.parse(rawStore); " +
            "        if (p && p.state) { " +
            "          if (!openSeqs.length && p.state.openSequences) openSeqs = p.state.openSequences; " +
            "          if (p.state.sequences) activeSeqs = p.state.sequences; " +
            "        } " +
            "      } " +
            "    } " +
            "    return JSON.stringify({ openSequences: openSeqs, sequences: activeSeqs }); " +
            "  } catch(e) { return JSON.stringify({ items: [] }); } " +
            "})()";

        mainWebView.evaluateJavascript(fetchJs, new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String rawJson) {
                runOnUiThread(() -> renderOpenSequenceHssModal(rawJson));
            }
        });
    }

    private void renderOpenSequenceHssModal(String rawJson) {
        String jsonStr = rawJson;
        if (jsonStr == null || jsonStr.equals("null") || jsonStr.trim().isEmpty()) {
            jsonStr = "{\"items\":[]}";
        }
        if (jsonStr.startsWith("\"") && jsonStr.endsWith("\"") && jsonStr.length() > 1) {
            try {
                jsonStr = new JSONTokener(jsonStr).nextValue().toString();
            } catch (Exception ignored) {}
        }

        final List<OpenHssSequenceItem> allItems = new ArrayList<>();
        final Set<String> selectedSeqs = new HashSet<>();

        try {
            JSONObject bundle = new JSONObject(jsonStr);
            final String[] months = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};

            JSONArray itemsArr = bundle.optJSONArray("items");
            if (itemsArr != null) {
                for (int i = 0; i < itemsArr.length(); i++) {
                    JSONObject ot = itemsArr.getJSONObject(i);
                    String seq = ot.optString("sequenceNumber", "").trim();
                    if (seq.isEmpty()) continue;

                    String sDate = ot.optString("startDate", "");
                    String eDate = ot.optString("endDate", sDate);
                    String base = ot.optString("base", "ORD");
                    if (base.isEmpty()) base = "ORD";

                    String seat = ot.optString("position", ot.optString("seat", "CA")).toUpperCase();
                    if (seat.contains("FO") || seat.contains("FIRST")) seat = "FO";
                    else if (seat.contains("FA")) seat = "FA";
                    else seat = "CA";

                    // Format Command Date (e.g. 19AUG)
                    String cmdDate = "";
                    if (!sDate.isEmpty() && sDate.contains("-")) {
                        String[] parts = sDate.split("-");
                        if (parts.length == 3) {
                            int m = Integer.parseInt(parts[1]);
                            String day = parts[2];
                            if (day.length() == 1) day = "0" + day;
                            String mStr = (m >= 1 && m <= 12) ? months[m - 1] : "AUG";
                            cmdDate = day + mStr;
                        }
                    }

                    // Credit
                    double crdHrs = ot.optDouble("creditHours", 0.0);
                    String creditStr = crdHrs > 0 ? String.format(java.util.Locale.US, "%.2fh Credit", crdHrs) : "";

                    // Layovers & Legs
                    String layovers = ot.optString("layoverDescription", "");
                    String legs = ot.optString("legsDescription", "");
                    boolean isDropBoard = ot.optBoolean("isDropBoard", false);

                    // Date range & duration
                    String dateRangeText = sDate;
                    if (!eDate.isEmpty() && !eDate.equals(sDate)) {
                        dateRangeText = sDate + " ➔ " + eDate;
                    }
                    String durText = "Pairing";

                    // Exact legality from app engine
                    boolean hasConflict = ot.optBoolean("hasConflict", false);
                    boolean isLegal = !hasConflict;
                    String conflictReason = ot.optString("conflictReason", "");

                    // Pre-select all legal sequences by default!
                    if (isLegal) {
                        selectedSeqs.add(seq);
                    }

                    allItems.add(new OpenHssSequenceItem(seq, sDate, eDate, dateRangeText, cmdDate, durText, base, seat, creditStr, layovers, legs, isDropBoard, isLegal, conflictReason));
                }
            } else {
                JSONArray openArr = bundle.optJSONArray("openSequences");
                JSONArray actArr = bundle.optJSONArray("sequences");

                // Extract active scheduled flying ranges
                List<String[]> activeRanges = new ArrayList<>();
                if (actArr != null) {
                    for (int i = 0; i < actArr.length(); i++) {
                        JSONObject s = actArr.getJSONObject(i);
                        boolean isDrop = s.optBoolean("isDropped", false) || s.optBoolean("isDtsDropped", false);
                        String sTag = s.optString("statusTag", "");
                        if (isDrop || sTag.equalsIgnoreCase("DROP") || sTag.equalsIgnoreCase("DROPPED")) continue;
                        String sd = s.optString("startDate", "");
                        String ed = s.optString("endDate", sd);
                        String sq = s.optString("sequenceNumber", "");
                        if (!sd.isEmpty()) activeRanges.add(new String[]{sd, ed, sq});
                    }
                }

                if (openArr != null) {
                    for (int i = 0; i < openArr.length(); i++) {
                        JSONObject ot = openArr.getJSONObject(i);
                        String seq = ot.optString("sequenceNumber", "").trim();
                        if (seq.isEmpty()) continue;

                        String sDate = ot.optString("startDate", "");
                        String eDate = ot.optString("endDate", sDate);
                        String base = ot.optString("base", "ORD");
                        if (base.isEmpty()) base = "ORD";

                        String seat = ot.optString("position", ot.optString("seat", "CA")).toUpperCase();
                        if (seat.contains("FO") || seat.contains("FIRST")) seat = "FO";
                        else if (seat.contains("FA")) seat = "FA";
                        else seat = "CA";

                        // Format Command Date (e.g. 19AUG)
                        String cmdDate = "";
                        if (!sDate.isEmpty() && sDate.contains("-")) {
                            String[] parts = sDate.split("-");
                            if (parts.length == 3) {
                                int m = Integer.parseInt(parts[1]);
                                String day = parts[2];
                                if (day.length() == 1) day = "0" + day;
                                String mStr = (m >= 1 && m <= 12) ? months[m - 1] : "AUG";
                                cmdDate = day + mStr;
                            }
                        }

                        // Credit
                        double crdHrs = ot.optDouble("creditHours", 0.0);
                        String creditStr = crdHrs > 0 ? String.format(java.util.Locale.US, "%.2fh Credit", crdHrs) : "";

                        // Layovers & Legs
                        String layovers = ot.optString("layoverDescription", "");
                        String legs = ot.optString("legsDescription", "");
                        boolean isDropBoard = ot.optBoolean("isDropBoard", false);

                        // Date range & duration
                        String dateRangeText = sDate;
                        if (!eDate.isEmpty() && !eDate.equals(sDate)) {
                            dateRangeText = sDate + " ➔ " + eDate;
                        }
                        String durText = "Pairing";

                        // Conflict Check against Active Scheduled Flying
                        boolean isLegal = true;
                        String conflictReason = "";
                        for (String[] act : activeRanges) {
                            String actStart = act[0];
                            String actEnd = act[1];
                            String actSeq = act[2];
                            if (sDate.compareTo(actEnd) <= 0 && eDate.compareTo(actStart) >= 0) {
                                isLegal = false;
                                conflictReason = "Overlaps with Seq #" + actSeq + " (" + actStart + " ➔ " + actEnd + ")";
                                break;
                            }
                        }

                        // Pre-select all legal sequences by default!
                        if (isLegal) {
                            selectedSeqs.add(seq);
                        }

                        allItems.add(new OpenHssSequenceItem(seq, sDate, eDate, dateRangeText, cmdDate, durText, base, seat, creditStr, layovers, legs, isDropBoard, isLegal, conflictReason));
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        final android.app.Dialog dialog = new android.app.Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        final LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#FFFFFF"));

        // 1. Header Bar
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setBackgroundColor(Color.parseColor("#0F172A")); // Slate 900
        header.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("⚡ Open Time HSS Lookup");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        title.setLayoutParams(tLp);
        header.addView(title);

        TextView closeBtn = new TextView(this);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#94A3B8"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        closeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        closeBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        closeBtn.setOnClickListener(v -> dialog.dismiss());
        header.addView(closeBtn);
        root.addView(header);

        // 2. Tab Bar: Tab 1 = "LEGAL" (Legal Trips Only), Tab 2 = "ALL" (All Sequences)
        final String[] activeTabKey = {"LEGAL"}; // "LEGAL" or "ALL"

        int legalCount = 0;
        for (OpenHssSequenceItem it : allItems) {
            if (it.isLegal) legalCount++;
        }
        final int finalLegalCount = legalCount;

        LinearLayout tabLayout = new LinearLayout(this);
        tabLayout.setOrientation(LinearLayout.HORIZONTAL);
        tabLayout.setBackgroundColor(Color.parseColor("#0F172A"));
        tabLayout.setPadding(dpToPx(12), dpToPx(2), dpToPx(12), dpToPx(8));

        final TextView legalTab = new TextView(this);
        legalTab.setText("✓ Legal Trips (" + finalLegalCount + ")");
        legalTab.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        legalTab.setTypeface(Typeface.DEFAULT_BOLD);
        legalTab.setGravity(Gravity.CENTER);
        legalTab.setClickable(true);
        legalTab.setFocusable(true);
        legalTab.setPadding(dpToPx(10), dpToPx(10), dpToPx(10), dpToPx(10));
        LinearLayout.LayoutParams ltLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        ltLp.setMargins(0, 0, dpToPx(4), 0);
        legalTab.setLayoutParams(ltLp);

        final TextView allTab = new TextView(this);
        allTab.setText("🌐 All Sequences (" + allItems.size() + ")");
        allTab.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        allTab.setTypeface(Typeface.DEFAULT_BOLD);
        allTab.setGravity(Gravity.CENTER);
        allTab.setClickable(true);
        allTab.setFocusable(true);
        allTab.setPadding(dpToPx(10), dpToPx(10), dpToPx(10), dpToPx(10));
        LinearLayout.LayoutParams atLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        atLp.setMargins(dpToPx(4), 0, 0, 0);
        allTab.setLayoutParams(atLp);

        tabLayout.addView(legalTab);
        tabLayout.addView(allTab);
        root.addView(tabLayout);

        // Subheader selection & info bar
        LinearLayout topInfoBar = new LinearLayout(this);
        topInfoBar.setOrientation(LinearLayout.HORIZONTAL);
        topInfoBar.setBackgroundColor(Color.parseColor("#F8FAFC"));
        topInfoBar.setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8));
        topInfoBar.setGravity(Gravity.CENTER_VERTICAL);

        final TextView selectAllBtn = new TextView(this);
        selectAllBtn.setText("Select All");
        selectAllBtn.setTextColor(Color.parseColor("#334155"));
        selectAllBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        selectAllBtn.setTypeface(Typeface.DEFAULT_BOLD);
        selectAllBtn.setBackground(createRoundedDrawable("#FFFFFF", "#CBD5E1", dpToPx(6)));
        selectAllBtn.setPadding(dpToPx(10), dpToPx(6), dpToPx(10), dpToPx(6));
        LinearLayout.LayoutParams sap = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sap.setMargins(0, 0, dpToPx(6), 0);
        selectAllBtn.setLayoutParams(sap);
        topInfoBar.addView(selectAllBtn);

        final TextView deselectAllBtn = new TextView(this);
        deselectAllBtn.setText("Deselect All");
        deselectAllBtn.setTextColor(Color.parseColor("#64748B"));
        deselectAllBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        deselectAllBtn.setTypeface(Typeface.DEFAULT_BOLD);
        deselectAllBtn.setBackground(createRoundedDrawable("#FFFFFF", "#CBD5E1", dpToPx(6)));
        deselectAllBtn.setPadding(dpToPx(10), dpToPx(6), dpToPx(10), dpToPx(6));
        LinearLayout.LayoutParams dap = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        deselectAllBtn.setLayoutParams(dap);
        topInfoBar.addView(deselectAllBtn);

        final TextView infoSummaryTv = new TextView(this);
        infoSummaryTv.setTextColor(Color.parseColor("#047857"));
        infoSummaryTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        infoSummaryTv.setTypeface(Typeface.DEFAULT_BOLD);
        infoSummaryTv.setGravity(Gravity.END);
        LinearLayout.LayoutParams isp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        infoSummaryTv.setLayoutParams(isp);
        topInfoBar.addView(infoSummaryTv);

        root.addView(topInfoBar);

        // 3. Cards Scroll Container
        final LinearLayout cardsContainer = new LinearLayout(this);
        cardsContainer.setOrientation(LinearLayout.VERTICAL);
        cardsContainer.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));

        // 4. Bottom Batch Bar
        LinearLayout bottomBatchBar = new LinearLayout(this);
        bottomBatchBar.setOrientation(LinearLayout.VERTICAL);
        bottomBatchBar.setBackgroundColor(Color.parseColor("#0F172A"));
        bottomBatchBar.setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12));

        final TextView batchCountTv = new TextView(this);
        batchCountTv.setTextColor(Color.parseColor("#94A3B8"));
        batchCountTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        batchCountTv.setTypeface(Typeface.DEFAULT_BOLD);
        batchCountTv.setGravity(Gravity.CENTER);
        batchCountTv.setPadding(0, 0, 0, dpToPx(6));
        bottomBatchBar.addView(batchCountTv);

        final TextView batchPullBtn = new TextView(this);
        batchPullBtn.setTextColor(Color.WHITE);
        batchPullBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        batchPullBtn.setTypeface(Typeface.DEFAULT_BOLD);
        batchPullBtn.setGravity(Gravity.CENTER);
        batchPullBtn.setBackground(createRoundedDrawable("#059669", "#047857", dpToPx(10)));
        batchPullBtn.setPadding(dpToPx(16), dpToPx(11), dpToPx(16), dpToPx(11));
        bottomBatchBar.addView(batchPullBtn);

        final Runnable updateBatchBar = () -> {
            boolean isLegalTab = activeTabKey[0].equals("LEGAL");
            int selCount = 0;
            int totalInTab = 0;
            for (OpenHssSequenceItem it : allItems) {
                if (isLegalTab && !it.isLegal) continue;
                totalInTab++;
                if (selectedSeqs.contains(it.seqNum)) selCount++;
            }

            infoSummaryTv.setText(selCount + " / " + totalInTab + " Selected");
            batchCountTv.setText(selCount + " of " + totalInTab + (isLegalTab ? " Legal Trips Selected" : " Sequences Selected"));

            if (selCount == 0) {
                batchPullBtn.setText("Select Sequences to Pull HSS");
                batchPullBtn.setBackground(createRoundedDrawable("#334155", "#1E293B", dpToPx(10)));
            } else {
                batchPullBtn.setText("🚀 Pull HSS For Selected (" + selCount + " " + (isLegalTab ? "Legal Trips" : "Sequences") + ")");
                batchPullBtn.setBackground(createRoundedDrawable(isLegalTab ? "#059669" : "#4338CA", isLegalTab ? "#047857" : "#3730A3", dpToPx(10)));
            }
        };

        final Runnable updateTabs = () -> {
            boolean isLegalTab = activeTabKey[0].equals("LEGAL");
            if (isLegalTab) {
                legalTab.setTextColor(Color.WHITE);
                legalTab.setBackground(createRoundedDrawable("#059669", "#047857", dpToPx(8)));
                allTab.setTextColor(Color.parseColor("#94A3B8"));
                allTab.setBackground(createRoundedDrawable("#1E293B", "#334155", dpToPx(8)));
                infoSummaryTv.setTextColor(Color.parseColor("#047857"));
            } else {
                legalTab.setTextColor(Color.parseColor("#94A3B8"));
                legalTab.setBackground(createRoundedDrawable("#1E293B", "#334155", dpToPx(8)));
                allTab.setTextColor(Color.WHITE);
                allTab.setBackground(createRoundedDrawable("#4338CA", "#3730A3", dpToPx(8)));
                infoSummaryTv.setTextColor(Color.parseColor("#4338CA"));
            }
        };

        final Runnable[] renderCardsHolder = new Runnable[1];

        final Runnable renderCards = () -> {
            cardsContainer.removeAllViews();
            int count = 0;
            boolean isLegalTab = activeTabKey[0].equals("LEGAL");

            for (final OpenHssSequenceItem item : allItems) {
                if (isLegalTab && !item.isLegal) continue;
                count++;

                final boolean isSel = selectedSeqs.contains(item.seqNum);

                final LinearLayout card = new LinearLayout(MainActivity.this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
                
                String cardBg = isSel ? (item.isLegal ? "#F0FDF4" : "#EEF2FF") : "#FFFFFF";
                String cardStroke = isSel ? (item.isLegal ? "#059669" : "#4338CA") : (item.isLegal ? "#E2E8F0" : "#FECDD3");
                card.setBackground(createRoundedDrawable(cardBg, cardStroke, dpToPx(12)));

                LinearLayout.LayoutParams cLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                cLp.setMargins(0, 0, 0, dpToPx(8));
                card.setLayoutParams(cLp);

                // Row 1: Checkbox + Seq # + Base/Seat + Type Badge
                LinearLayout topRow = new LinearLayout(MainActivity.this);
                topRow.setOrientation(LinearLayout.HORIZONTAL);
                topRow.setGravity(Gravity.CENTER_VERTICAL);

                TextView cbBtn = new TextView(MainActivity.this);
                cbBtn.setText(isSel ? "✓ SELECTED" : "○ SELECT");
                cbBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
                cbBtn.setTypeface(Typeface.DEFAULT_BOLD);
                cbBtn.setTextColor(isSel ? Color.WHITE : Color.parseColor("#475569"));
                cbBtn.setBackground(createRoundedDrawable(isSel ? (item.isLegal ? "#059669" : "#4338CA") : "#F1F5F9", isSel ? (item.isLegal ? "#047857" : "#3730A3") : "#CBD5E1", dpToPx(6)));
                cbBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
                topRow.addView(cbBtn);

                TextView seqBadge = new TextView(MainActivity.this);
                seqBadge.setText(" SEQ #" + item.seqNum);
                seqBadge.setTextColor(Color.parseColor("#0F172A"));
                seqBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f);
                seqBadge.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
                LinearLayout.LayoutParams sbLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                sbLp.setMargins(dpToPx(6), 0, 0, 0);
                seqBadge.setLayoutParams(sbLp);
                topRow.addView(seqBadge);

                TextView baseBadge = new TextView(MainActivity.this);
                baseBadge.setText(" " + item.base + " " + item.seat);
                baseBadge.setTextColor(Color.parseColor("#64748B"));
                baseBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
                baseBadge.setTypeface(Typeface.DEFAULT_BOLD);
                LinearLayout.LayoutParams bbLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
                bbLp.setMargins(dpToPx(4), 0, 0, 0);
                baseBadge.setLayoutParams(bbLp);
                topRow.addView(baseBadge);

                TextView typeTag = new TextView(MainActivity.this);
                typeTag.setText(item.isDropBoard ? "💎 PICKUP" : "⚡ OPEN TIME");
                typeTag.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9.5f);
                typeTag.setTypeface(Typeface.DEFAULT_BOLD);
                typeTag.setTextColor(item.isDropBoard ? Color.parseColor("#0F766E") : Color.parseColor("#B45309"));
                typeTag.setBackground(createRoundedDrawable(item.isDropBoard ? "#F0FDFA" : "#FFFBEB", item.isDropBoard ? "#99F6E4" : "#FDE68A", dpToPx(5)));
                typeTag.setPadding(dpToPx(6), dpToPx(2), dpToPx(6), dpToPx(2));
                topRow.addView(typeTag);

                card.addView(topRow);

                // Row 2: Legality Callout Badge
                TextView legalityBadge = new TextView(MainActivity.this);
                if (item.isLegal) {
                    legalityBadge.setText("✓ 100% Legal Schedule Pickup (0 Conflicts)");
                    legalityBadge.setTextColor(Color.parseColor("#047857"));
                    legalityBadge.setBackground(createRoundedDrawable("#ECFDF5", "#A7F3D0", dpToPx(6)));
                } else {
                    legalityBadge.setText("🚫 Not Legal: • " + item.conflictReason);
                    legalityBadge.setTextColor(Color.parseColor("#BE123C"));
                    legalityBadge.setBackground(createRoundedDrawable("#FFF1F2", "#FECDD3", dpToPx(6)));
                }
                legalityBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
                legalityBadge.setTypeface(Typeface.DEFAULT_BOLD);
                legalityBadge.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
                LinearLayout.LayoutParams legLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                legLp.setMargins(0, dpToPx(6), 0, dpToPx(4));
                legalityBadge.setLayoutParams(legLp);
                card.addView(legalityBadge);

                // Row 3: Dates, Duration & Credit
                TextView dateText = new TextView(MainActivity.this);
                dateText.setText("📅 " + item.dateRangeText + (item.credit.isEmpty() ? "" : (" • " + item.credit)));
                dateText.setTextColor(Color.parseColor("#334155"));
                dateText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
                dateText.setTypeface(Typeface.DEFAULT_BOLD);
                LinearLayout.LayoutParams dtLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                dtLp.setMargins(0, dpToPx(2), 0, dpToPx(4));
                dateText.setLayoutParams(dtLp);
                card.addView(dateText);

                // Row 4: Dual 1-Tap Action Buttons (Pull HSS & DECS Pickup HTO)
                LinearLayout btnRow = new LinearLayout(MainActivity.this);
                btnRow.setOrientation(LinearLayout.HORIZONTAL);
                LinearLayout.LayoutParams brLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                brLp.setMargins(0, dpToPx(4), 0, 0);
                btnRow.setLayoutParams(brLp);

                TextView execHssBtn = new TextView(MainActivity.this);
                String cmd = "HSS/" + item.seat + "/" + item.seqNum + (item.cmdDate.isEmpty() ? "" : ("/" + item.cmdDate));
                execHssBtn.setText("⚡ Pull HSS");
                execHssBtn.setTextColor(Color.WHITE);
                execHssBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
                execHssBtn.setTypeface(Typeface.DEFAULT_BOLD);
                execHssBtn.setGravity(Gravity.CENTER);
                execHssBtn.setBackground(createRoundedDrawable("#4338CA", "#3730A3", dpToPx(6)));
                execHssBtn.setPadding(dpToPx(6), dpToPx(7), dpToPx(6), dpToPx(7));
                LinearLayout.LayoutParams hssLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
                hssLp.setMargins(0, 0, dpToPx(4), 0);
                execHssBtn.setLayoutParams(hssLp);
                execHssBtn.setOnClickListener(v -> {
                    executeAutonomousHssCapture(cmd);
                    dialog.dismiss();
                });
                btnRow.addView(execHssBtn);

                TextView execPickupBtn = new TextView(MainActivity.this);
                String pickupMacro = "HIY^HT^HTO/B/" + item.seqNum + "/" + item.cmdDate + "/" + (item.seat.equals("FO") ? "FO" : "CA") + "^HTMD^HZ^HIN^";
                execPickupBtn.setText("🚀 DECS Pickup (HTO)");
                execPickupBtn.setTextColor(Color.WHITE);
                execPickupBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
                execPickupBtn.setTypeface(Typeface.DEFAULT_BOLD);
                execPickupBtn.setGravity(Gravity.CENTER);
                execPickupBtn.setBackground(createRoundedDrawable(item.isLegal ? "#059669" : "#D97706", item.isLegal ? "#047857" : "#B45309", dpToPx(6)));
                execPickupBtn.setPadding(dpToPx(6), dpToPx(7), dpToPx(6), dpToPx(7));
                LinearLayout.LayoutParams pickLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.2f);
                execPickupBtn.setLayoutParams(pickLp);
                execPickupBtn.setOnClickListener(v -> {
                    executeAutonomousHssCapture(pickupMacro);
                    dialog.dismiss();
                });
                btnRow.addView(execPickupBtn);

                card.addView(btnRow);

                // Toggle Selection on Card Click
                card.setClickable(true);
                card.setFocusable(true);
                card.setOnClickListener(v -> {
                    if (selectedSeqs.contains(item.seqNum)) {
                        selectedSeqs.remove(item.seqNum);
                    } else {
                        selectedSeqs.add(item.seqNum);
                    }
                    if (renderCardsHolder[0] != null) renderCardsHolder[0].run();
                });

                cardsContainer.addView(card);
            }

            if (count == 0) {
                TextView emptyTv = new TextView(MainActivity.this);
                emptyTv.setText(isLegalTab ? "No legal Open Time sequences found.\nCheck the 'All Sequences' tab for all trips." : "No Open Time sequences found.\nPull N4D first or upload an open time list.");
                emptyTv.setTextColor(Color.parseColor("#94A3B8"));
                emptyTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                emptyTv.setGravity(Gravity.CENTER);
                emptyTv.setPadding(dpToPx(16), dpToPx(32), dpToPx(16), dpToPx(32));
                cardsContainer.addView(emptyTv);
            }

            updateBatchBar.run();
        };

        renderCardsHolder[0] = renderCards;

        // Tab click listeners
        legalTab.setOnClickListener(v -> {
            activeTabKey[0] = "LEGAL";
            updateTabs.run();
            if (renderCardsHolder[0] != null) renderCardsHolder[0].run();
        });

        allTab.setOnClickListener(v -> {
            activeTabKey[0] = "ALL";
            updateTabs.run();
            if (renderCardsHolder[0] != null) renderCardsHolder[0].run();
        });

        updateTabs.run();

        // Handlers for Quick Action Buttons
        selectAllBtn.setOnClickListener(v -> {
            boolean isLegalTab = activeTabKey[0].equals("LEGAL");
            for (OpenHssSequenceItem it : allItems) {
                if (isLegalTab && !it.isLegal) continue;
                selectedSeqs.add(it.seqNum);
            }
            if (renderCardsHolder[0] != null) renderCardsHolder[0].run();
        });

        deselectAllBtn.setOnClickListener(v -> {
            boolean isLegalTab = activeTabKey[0].equals("LEGAL");
            for (OpenHssSequenceItem it : allItems) {
                if (isLegalTab && !it.isLegal) continue;
                selectedSeqs.remove(it.seqNum);
            }
            if (renderCardsHolder[0] != null) renderCardsHolder[0].run();
        });

        // ScrollView for Cards
        ScrollView sv = new ScrollView(this);
        sv.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
        sv.addView(cardsContainer);
        root.addView(sv);

        // Batch Pull Button Click Handler (Executes full TAFB/MD sequential capture for each HSS)
        batchPullBtn.setOnClickListener(v -> {
            final List<String> toPullCmds = new ArrayList<>();
            for (OpenHssSequenceItem it : allItems) {
                if (selectedSeqs.contains(it.seqNum)) {
                    String cmd = "HSS/" + it.seat + "/" + it.seqNum + (it.cmdDate.isEmpty() ? "" : ("/" + it.cmdDate));
                    toPullCmds.add(cmd);
                }
            }

            if (toPullCmds.isEmpty()) {
                Toast.makeText(MainActivity.this, "No sequences selected.", Toast.LENGTH_SHORT).show();
                return;
            }

            executeBatchHssCapture(toPullCmds);
            dialog.dismiss();
        });

        root.addView(bottomBatchBar);

        // Initial Render
        renderCards.run();

        dialog.setContentView(root);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, (int) (getResources().getDisplayMetrics().heightPixels * 0.82));
            dialog.getWindow().setGravity(Gravity.BOTTOM);
        }
        dialog.show();
    }

    private void executeMultiStepLoginMacro() {
        Toast.makeText(this, "Logging into DECS...", Toast.LENGTH_SHORT).show();
        sendDirectDecsCommand("//MQ");

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            sendDirectDecsCommand("BSIP742840");
        }, 800);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            sendDirectDecsCommand("SARA202");
        }, 1600);
    }

    private void executeAutonomousHiCapture(final String command) {
        if (portalWebView == null) return;
        Toast.makeText(this, "Fetching " + command + " & scrolling all pages...", Toast.LENGTH_SHORT).show();

        String js = "if (window.runAutonomousHiCapture) { window.runAutonomousHiCapture('" + command + "'); } else {" +
            "  var st = window.sabreTerm && window.sabreTerm.getString ? window.sabreTerm.getString() : '';" +
            "  if (window.AndroidPortal && window.AndroidPortal.onHiCaptureComplete) {" +
            "    window.AndroidPortal.onHiCaptureComplete('" + command + "', st, 1);" +
            "  }" +
            "}";

        portalWebView.evaluateJavascript(js, null);
    }

    private TextView createKeypadButton(String label, String bgColor, String textColor, View.OnClickListener listener) {
        TextView btn = new TextView(this);
        btn.setText(label);
        btn.setTextColor(Color.parseColor(textColor));
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        btn.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        btn.setGravity(Gravity.CENTER);
        btn.setPadding(dpToPx(6), dpToPx(12), dpToPx(6), dpToPx(12));
        btn.setBackground(createRoundedDrawable(bgColor, "#334155", dpToPx(8)));
        btn.setOnClickListener(listener);
        return btn;
    }

    private GradientDrawable createRoundedDrawable(String fillColor, String strokeColor, int radius) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(Color.parseColor(fillColor));
        gd.setCornerRadius(radius);
        if (strokeColor != null) {
            gd.setStroke(dpToPx(1), Color.parseColor(strokeColor));
        }
        return gd;
    }

    private TextView createHeaderButton(String text, View.OnClickListener listener) {
        TextView btn = new TextView(this);
        btn.setText(text);
        btn.setTextColor(Color.WHITE);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        btn.setPadding(dpToPx(8), dpToPx(6), dpToPx(8), dpToPx(6));
        btn.setOnClickListener(listener);
        return btn;
    }

    private int dpToPx(float dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    public void showPortalView(String url) {
        if (portalLayout != null) {
            portalLayout.setVisibility(View.VISIBLE);
            if (manualCommandInput != null) {
                manualCommandInput.setText("");
            }
            if (portalWebView != null) {
                String target = (url != null && !url.isEmpty()) ? url : "https://webfos.aa.com/WebSabre/websabre";
                if (!target.equals(portalWebView.getUrl())) {
                    portalWebView.loadUrl(target);
                } else {
                    isolateAndFitDecsCanvas();
                }
            }
        }
    }

    public void hidePortalView() {
        if (portalLayout != null) {
            portalLayout.setVisibility(View.GONE);
        }
    }

    private void isolateAndFitDecsCanvas() {
        if (portalWebView == null) return;

        String script = loadAssetAsString("decs_engine.js");
        if (script != null && !script.isEmpty()) {
            portalWebView.evaluateJavascript(script, null);
        }
    }

    private String loadAssetAsString(String assetName) {
        try {
            java.io.InputStream is = getAssets().open(assetName);
            java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            reader.close();
            is.close();
            return sb.toString();
        } catch (Exception e) {
            Log.e("MainActivity", "Error reading asset " + assetName, e);
            return null;
        }
    }

    private void executeAutonomousHssCapture(final String command) {
        if (portalWebView == null) return;
        Toast.makeText(this, "⚡ Pulling " + command + " & checking TAFB/MD...", Toast.LENGTH_SHORT).show();
        String clean = command.replace("\\", "\\\\").replace("'", "\\'");
        String js = "if (window.runAutonomousHiCapture) { window.runAutonomousHiCapture('" + clean + "'); }";
        portalWebView.evaluateJavascript(js, null);
    }

    private void executeBatchHssCapture(final List<String> commands) {
        if (portalWebView == null || commands.isEmpty()) return;
        Toast.makeText(this, "⚡ Batch pulling " + commands.size() + " pairing(s) with full TAFB/MD capture...", Toast.LENGTH_LONG).show();
        org.json.JSONArray arr = new org.json.JSONArray();
        for (String c : commands) {
            arr.put(c);
        }
        String js = "if (window.runBatchHssCapture) { window.runBatchHssCapture(" + arr.toString() + "); }";
        portalWebView.evaluateJavascript(js, null);
    }

    private void sendDirectDecsCommand(String cmd) {
        if (portalWebView == null) return;

        String clean = cmd.replace("\\", "\\\\").replace("'", "\\'");
        String js = "if (window.sendDecsKey) { window.sendDecsKey('" + clean + "'); } else {" +
            "  var inp = document.getElementById('sabreInput') || document.querySelector('input');" +
            "  if (inp) {" +
            "    inp.value = '" + clean + "';" +
            "    inp.dispatchEvent(new Event('input', { bubbles: true }));" +
            "    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));" +
            "  }" +
            "}";

        portalWebView.evaluateJavascript(js, null);
        String label = cmd.equals("CTRL_HOME") ? "⌂ Home (Ctrl+Home)" : (cmd.equals("CTRL_BACKSPACE") ? "⌫ Clear (Ctrl+Bksp)" : (cmd.equals("SHIFT_DELETE") ? "⌧ Clear Page (Shift+Delete)" : (cmd.equals("SHIFT_ENTER") ? "↵ Line Down" : cmd)));
        Toast.makeText(this, "Sent: " + label, Toast.LENGTH_SHORT).show();
    }

    private void extractScheduleAndImport() {
        if (portalWebView == null) return;

        // Extracts screen text from WebSabre internal buffers, canvas text, or DOM nodes
        String js = "(function() {" +
            "  var text = '';" +
            "  if (window.sabreTerm && window.sabreTerm.getString) text = window.sabreTerm.getString();" +
            "  else if (window.WebSabre && window.WebSabre.getScreenText) text = window.WebSabre.getScreenText();" +
            "  else if (window.sabre && window.sabre.getScreen) text = window.sabre.getScreen();" +
            "  else if (document.body) text = document.body.innerText || '';" +
            "  if (window.AndroidPortal && window.AndroidPortal.onHiCaptureComplete) {" +
            "    window.AndroidPortal.onHiCaptureComplete('Visible Screen', text, 1);" +
            "  }" +
            "  return text;" +
            "})();";

        portalWebView.evaluateJavascript(js, null);
    }

    private void handleCapturedSchedule(String command, String capturedText, int pageCount) {
        if (capturedText == null || capturedText.trim().isEmpty()) {
            Toast.makeText(MainActivity.this, "No schedule data captured for " + command, Toast.LENGTH_SHORT).show();
            return;
        }

        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            ClipData clip = ClipData.newPlainText("DECS " + command, capturedText);
            clipboard.setPrimaryClip(clip);
        }

        WebView mainWv = getBridge() != null ? getBridge().getWebView() : null;
        if (mainWv != null) {
            String cleanForJs = capturedText.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$");
            String triggerScript = "window.dispatchEvent(new CustomEvent('nativeScheduleImport', { detail: `" + cleanForJs + "` }));";
            mainWv.evaluateJavascript(triggerScript, null);
        }

        if (command != null && command.toUpperCase().startsWith("N6D")) {
            Toast.makeText(MainActivity.this, "✓ " + command + " (" + pageCount + " pages) Updated Reserve List!", Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(MainActivity.this, "✓ " + command + " (" + pageCount + " pages) Merged to Calendar!", Toast.LENGTH_SHORT).show();
        }
        // Do NOT call hidePortalView(); user stays in DECS terminal!
    }

    private void showBatchCompletionDialog(final int totalCount) {
        final android.app.Dialog dialog = new android.app.Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(createRoundedDrawable("#0F172A", "#1E293B", dpToPx(16)));
        root.setPadding(dpToPx(20), dpToPx(20), dpToPx(20), dpToPx(20));

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView iconTv = new TextView(this);
        iconTv.setText("🎉");
        iconTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        header.addView(iconTv);

        TextView titleTv = new TextView(this);
        titleTv.setText("  All (" + totalCount + ") Pairings Captured!");
        titleTv.setTextColor(Color.WHITE);
        titleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        titleTv.setTypeface(Typeface.DEFAULT_BOLD);
        header.addView(titleTv);

        root.addView(header);

        // Body message
        TextView msgTv = new TextView(this);
        msgTv.setText("Successfully pulled all " + totalCount + " selected HSS pairings with full multi-page flight legs, layovers, and TAFB details. All calendar trips are fully updated.");
        msgTv.setTextColor(Color.parseColor("#94A3B8"));
        msgTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        msgTv.setPadding(0, dpToPx(12), 0, dpToPx(16));
        root.addView(msgTv);

        // Action Buttons Row
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        TextView stayBtn = new TextView(this);
        stayBtn.setText("Stay in DECS");
        stayBtn.setTextColor(Color.parseColor("#CBD5E1"));
        stayBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f);
        stayBtn.setTypeface(Typeface.DEFAULT_BOLD);
        stayBtn.setGravity(Gravity.CENTER);
        stayBtn.setBackground(createRoundedDrawable("#1E293B", "#334155", dpToPx(8)));
        stayBtn.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        LinearLayout.LayoutParams stayLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        stayLp.setMargins(0, 0, dpToPx(6), 0);
        stayBtn.setLayoutParams(stayLp);
        stayBtn.setOnClickListener(v -> dialog.dismiss());
        btnRow.addView(stayBtn);

        TextView viewCalBtn = new TextView(this);
        viewCalBtn.setText("View Schedule");
        viewCalBtn.setTextColor(Color.WHITE);
        viewCalBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f);
        viewCalBtn.setTypeface(Typeface.DEFAULT_BOLD);
        viewCalBtn.setGravity(Gravity.CENTER);
        viewCalBtn.setBackground(createRoundedDrawable("#4338CA", "#3730A3", dpToPx(8)));
        viewCalBtn.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        LinearLayout.LayoutParams calLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        calLp.setMargins(dpToPx(6), 0, 0, 0);
        viewCalBtn.setLayoutParams(calLp);
        viewCalBtn.setOnClickListener(v -> {
            dialog.dismiss();
            hidePortalView();
        });
        btnRow.addView(viewCalBtn);

        root.addView(btnRow);

        dialog.setContentView(root);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
        }
        dialog.show();
    }

    @Override
    public void onBackPressed() {
        if (portalLayout != null && portalLayout.getVisibility() == View.VISIBLE) {
            if (portalWebView != null && portalWebView.canGoBack()) {
                portalWebView.goBack();
                return;
            }
            hidePortalView();
            return;
        }
        super.onBackPressed();
    }

    public class PortalBridge {
        @JavascriptInterface
        public void open(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    showPortalView(url);
                }
            });
        }

        @JavascriptInterface
        public void close() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    hidePortalView();
                }
            });
        }

        @JavascriptInterface
        public void reload() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (portalWebView != null) portalWebView.reload();
                }
            });
        }

        @JavascriptInterface
        public void executeHss(final String command) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    executeAutonomousHssCapture(command);
                }
            });
        }

        @JavascriptInterface
        public void onHiCaptureComplete(final String command, final String text, final int pages) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    handleCapturedSchedule(command, text, pages);
                }
            });
        }

        @JavascriptInterface
        public void onBatchCaptureComplete(final int totalCount) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    showBatchCompletionDialog(totalCount);
                }
            });
        }
    }
}
