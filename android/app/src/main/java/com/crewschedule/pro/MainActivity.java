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

        // ROW 1: Login & Password Buttons (//MQ, BSIP742840, SARA202, Full Macro)
        keyGrid.addView(createButtonRow(
            new KeyDef("🔑 1-Tap Login", "//MQ^BSIP742840^SARA202^", "#059669", true, true),
            new KeyDef("//MQ", "//MQ", "#0D9488", true, false),
            new KeyDef("BSIP742840", "BSIP742840", "#0284C7", true, false),
            new KeyDef("SARA202", "SARA202", "#4F46E5", true, false)
        ));

        // ROW 2: Schedule & Pairing Buttons (HI1, HI2, HSS)
        keyGrid.addView(createButtonRow(
            new KeyDef("HI1 (Month 1)", "HI1", "#0284C7", false, false, true, false),
            new KeyDef("HI2 (Month 2)", "HI2", "#0284C7", false, false, true, false),
            new KeyDef("HSS (Pairing)", "HSS/", "#1E293B", false, false, false, true)
        ));

        // ROW 3: Navigation & Paging (MD, MU, Y, Line Down)
        keyGrid.addView(createButtonRow(
            new KeyDef("MD ⬇ (Next)", "MD", "#0369A1", true, false, false),
            new KeyDef("MU ⬆ (Prev)", "MU", "#0369A1", true, false, false),
            new KeyDef("Y (More)", "Y", "#047857", true, false, false),
            new KeyDef("↵ (Line Down)", "SHIFT_ENTER", "#059669", true, false, false)
        ));

        // ROW 4: Home (Ctrl+Home) & Clear Page (Shift+Del) for testing & terminal control
        keyGrid.addView(createButtonRow(
            new KeyDef("⌂ Home (Ctrl+Home)", "CTRL_HOME", "#0D9488", true, false, false),
            new KeyDef("⌧ Clear Page (Shift+Del)", "SHIFT_DELETE", "#DC2626", true, false, false)
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

    private static class KeyDef {
        String label;
        String command;
        String color;
        boolean sendImmediately;
        boolean isMultiStepMacro;
        boolean isHiMacro;
        boolean isHssMacro;

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro, boolean isHssMacro) {
            this.label = label;
            this.command = command;
            this.color = color;
            this.sendImmediately = sendImmediately;
            this.isMultiStepMacro = isMultiStepMacro;
            this.isHiMacro = isHiMacro;
            this.isHssMacro = isHssMacro;
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro, boolean isHiMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, isHiMacro, false);
        }

        KeyDef(String label, String command, String color, boolean sendImmediately, boolean isMultiStepMacro) {
            this(label, command, color, sendImmediately, isMultiStepMacro, false, false);
        }
    }

    private LinearLayout createButtonRow(KeyDef... keys) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        row.setPadding(0, dpToPx(3), 0, dpToPx(3));

        for (KeyDef k : keys) {
            TextView btn = createKeypadButton(k.label, k.color, "#FFFFFF", v -> {
                if (k.isHssMacro) {
                    executeHssPairingPopUpMacro();
                } else if (k.isHiMacro) {
                    executeAutonomousHiCapture(k.command);
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
            lp.setMargins(dpToPx(3), dpToPx(3), dpToPx(3), dpToPx(3));
            btn.setLayoutParams(lp);
            row.addView(btn);
        }
        return row;
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

        // Automatically monitors and isolates the DECS canvas exclusively when on WebSabre
        String script = "(function() {" +
            "  function applyDecsIsolation() {" +
            "    var url = window.location.href.toLowerCase();" +
            "    var isWebSabre = url.includes('websabre') || url.includes('webfos');" +
            "    if (!isWebSabre && (url.includes('login') || url.includes('sso') || url.includes('okta') || url.includes('ping') || url.includes('saml'))) {" +
            "      return;" +
            "    }" +
            "    if (!isWebSabre) {" +
            "      return;" +
            "    }" +
            "    console.log('CSP_DECS_URL: ' + window.location.href);" +
            "    console.log('CSP_DECS_CANVAS: ' + !!document.querySelector('canvas') + ' IFRAMES: ' + document.querySelectorAll('iframe').length);" +
            "    var elements = Array.from(document.body.children).map(function(c){ return c.tagName + '#' + c.id + '.' + c.className; });" +
            "    console.log('CSP_BODY_CHILDREN: ' + elements.join(' | '));" +
            "    var meta = document.querySelector('meta[name=\"viewport\"]');" +
            "    if (!meta) {" +
            "      meta = document.createElement('meta');" +
            "      meta.name = 'viewport';" +
            "      document.head.appendChild(meta);" +
            "    }" +
            "    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes';" +
            "    var existingStyle = document.getElementById('csp-decs-isolated-style');" +
            "    if (!existingStyle) {" +
            "      var st = document.createElement('style');" +
            "      st.id = 'csp-decs-isolated-style';" +
            "      st.innerHTML = 'html, body { background-color: #000000 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; }';" +
            "      document.head.appendChild(st);" +
            "    }" +
            "    var canvas = document.querySelector('canvas') || document.querySelector('#sabreTerm');" +
            "    var targetEl = canvas || document.getElementById('webSabreEmulator');" +
            "    if (targetEl) {" +
            "      var curr = targetEl;" +
            "      while (curr && curr !== document.body && curr !== document.documentElement) {" +
            "        var parent = curr.parentElement;" +
            "        if (parent) {" +
            "          for (var j = 0; j < parent.children.length; j++) {" +
            "            var sib = parent.children[j];" +
            "            if (sib !== curr && sib.tagName !== 'SCRIPT' && sib.id !== 'csp-decs-isolated-style') {" +
            "              sib.style.setProperty('display', 'none', 'important');" +
            "              sib.style.setProperty('visibility', 'hidden', 'important');" +
            "              sib.style.setProperty('height', '0px', 'important');" +
            "              sib.style.setProperty('max-height', '0px', 'important');" +
            "              sib.style.setProperty('overflow', 'hidden', 'important');" +
            "            }" +
            "          }" +
            "          parent.style.setProperty('margin', '0px', 'important');" +
            "          parent.style.setProperty('padding', '0px', 'important');" +
            "          parent.style.setProperty('width', '100vw', 'important');" +
            "          parent.style.setProperty('min-width', '100vw', 'important');" +
            "          parent.style.setProperty('max-width', '100vw', 'important');" +
            "          parent.style.setProperty('height', '100%', 'important');" +
            "          parent.style.setProperty('background', '#000000', 'important');" +
            "        }" +
            "        curr = parent;" +
            "      }" +
            "      if (canvas) {" +
            "        canvas.style.setProperty('position', 'fixed', 'important');" +
            "        canvas.style.setProperty('top', '0px', 'important');" +
            "        canvas.style.setProperty('left', '0px', 'important');" +
            "        canvas.style.setProperty('width', '100vw', 'important');" +
            "        canvas.style.setProperty('min-width', '100vw', 'important');" +
            "        canvas.style.setProperty('max-width', '100vw', 'important');" +
            "        canvas.style.setProperty('height', '100%', 'important');" +
            "        canvas.style.setProperty('max-height', '100%', 'important');" +
            "        canvas.style.setProperty('object-fit', 'contain', 'important');" +
            "        canvas.style.setProperty('margin', '0px', 'important');" +
            "        canvas.style.setProperty('padding', '0px', 'important');" +
            "        canvas.style.setProperty('z-index', '2147483647', 'important');" +
            "        canvas.style.setProperty('background', '#000000', 'important');" +
            "      }" +
            "    }" +
            "  }" +
            "  applyDecsIsolation();" +
            "  setInterval(applyDecsIsolation, 300);" +
            "  window.sendDecsKey = function(cmd) {" +
            "    if (window.sabreTerm && window.sabreTerm.screen) {" +
            "      var st = window.sabreTerm;" +
            "      var scr = st.screen;" +
            "      if (cmd === 'SHIFT_ENTER' || cmd === 'NEWLINE') {" +
            "        var nextRow = (scr.currentLine + 1 < scr.size.y) ? (scr.currentLine + 1) : 0;" +
            "        scr.setCursor(0, nextRow);" +
            "        scr.setSOM(0, nextRow);" +
            "        scr.setCurrentLineCurrentColumn(0, nextRow);" +
            "        scr.showLineNumber();" +
            "        return;" +
            "      }" +
            "      if (cmd === 'CTRL_HOME' || cmd === 'HOME') {" +
            "        var target = document.querySelector('canvas') || document.activeElement || document.body;" +
            "        var evOpts = { key: 'Home', code: 'Home', keyCode: 36, which: 36, ctrlKey: true, bubbles: true, cancelable: true };" +
            "        if (target) {" +
            "          target.dispatchEvent(new KeyboardEvent('keydown', evOpts));" +
            "          target.dispatchEvent(new KeyboardEvent('keyup', evOpts));" +
            "        }" +
            "        window.dispatchEvent(new KeyboardEvent('keydown', evOpts));" +
            "        window.dispatchEvent(new KeyboardEvent('keyup', evOpts));" +
            "        if (st.home) {" +
            "          try { st.home(); } catch(e) {}" +
            "        }" +
            "        if (scr) {" +
            "          try {" +
            "            if (scr.home) scr.home();" +
            "            scr.setCursor(0, 0);" +
            "            scr.setSOM(0, 0);" +
            "            scr.setCurrentLineCurrentColumn(0, 0);" +
            "            scr.showLineNumber();" +
            "          } catch(e) {}" +
            "        }" +
            "        return;" +
            "      }" +
            "      if (cmd === 'SHIFT_DELETE' || cmd === 'CLEAR' || cmd === 'CLEAR_PAGE') {" +
            "        if (st.clearScreen) {" +
            "          try { st.clearScreen(); } catch(e) {}" +
            "        } else if (st.eraseScreen) {" +
            "          try { st.eraseScreen(); } catch(e) {}" +
            "        } else if (st.eraseAll) {" +
            "          try { st.eraseAll(); } catch(e) {}" +
            "        } else if (scr && scr.eraseScreen) {" +
            "          try { scr.eraseScreen(); } catch(e) {}" +
            "        } else if (scr && scr.clear) {" +
            "          try { scr.clear(); } catch(e) {}" +
            "        }" +
            "        var target = document.querySelector('canvas') || document.activeElement || document.body;" +
            "        var evOpts = { key: 'Delete', code: 'Delete', keyCode: 46, which: 46, shiftKey: true, bubbles: true, cancelable: true };" +
            "        if (target) {" +
            "          target.dispatchEvent(new KeyboardEvent('keydown', evOpts));" +
            "          target.dispatchEvent(new KeyboardEvent('keyup', evOpts));" +
            "        }" +
            "        window.dispatchEvent(new KeyboardEvent('keydown', evOpts));" +
            "        window.dispatchEvent(new KeyboardEvent('keyup', evOpts));" +
            "        document.dispatchEvent(new KeyboardEvent('keydown', evOpts));" +
            "        document.dispatchEvent(new KeyboardEvent('keyup', evOpts));" +
            "        if (scr) {" +
            "          try {" +
            "            scr.setCursor(0, 0);" +
            "            scr.setSOM(0, 0);" +
            "            scr.setCurrentLineCurrentColumn(0, 0);" +
            "            scr.showLineNumber();" +
            "          } catch(e) {}" +
            "        }" +
            "        var inp = document.getElementById('sabreInput') || document.querySelector('input');" +
            "        if (inp) {" +
            "          inp.value = '';" +
            "        }" +
            "        return;" +
            "      }" +
            "      for (var i = 0; i < cmd.length; i++) {" +
            "        var ch = cmd[i];" +
            "        if (ch === '^') {" +
            "          st.keyPressed(13);" +
            "        } else {" +
            "          st.keyPressed(ch.charCodeAt(0));" +
            "        }" +
            "      }" +
            "      if (!cmd.endsWith('/')) {" +
            "        st.keyPressed(13);" +
            "      }" +
            "      return;" +
            "    }" +
            "    var inp = document.getElementById('sabreInput') || document.querySelector('input');" +
            "    if (inp) {" +
            "      inp.value = cmd;" +
            "      inp.dispatchEvent(new Event('input', { bubbles: true }));" +
            "      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));" +
            "      inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));" +
            "    }" +
            "  };" +
            "  window.runAutonomousHiCapture = function(hiCommand) {" +
            "    return new Promise(function(resolve) {" +
            "      var st = window.sabreTerm;" +
            "      if (!st || !st.screen) {" +
            "        resolve({ success: false, text: '', pages: 0, error: 'WebSabre not ready' });" +
            "        return;" +
            "      }" +
            "      function sleep(ms) {" +
            "        return new Promise(function(r) { setTimeout(r, ms); });" +
            "      }" +
            "      function isFinished(text) {" +
            "        if (!text) return false;" +
            "        var upper = text.toUpperCase();" +
            "        var isHss = hiCommand.toUpperCase().startsWith('HSS');" +
            "        if (isHss && (upper.includes('TAFB') || upper.includes('TAXABLE EXP') || upper.includes('TAXABLE'))) {" +
            "          return true;" +
            "        }" +
            "        return upper.includes('BOTTOM OF') || upper.includes('NO MORE DATA') || upper.includes('END OF DISP') || upper.includes('END F DISP') || upper.includes('END OF SCROL') || upper.includes('ENDOF SCROL') || upper.includes('NO MORE SCROLL') || upper.includes('COMMAND COMPLETE') || upper.includes('LAST PAGE') || upper.includes('NO MORE');" +
            "      }" +
            "      (async function() {" +
            "        var initialScreen = st.getString ? st.getString() : '';" +
            "        window.sendDecsKey(hiCommand);" +
            "        var page1Text = '';" +
            "        for (var w = 0; w < 20; w++) {" +
            "          await sleep(200);" +
            "          var cur = st.getString ? st.getString() : '';" +
            "          if (cur && cur.length > 50 && (cur !== initialScreen || cur.includes('MONTH ENDING') || cur.includes('DD ST') || cur.includes('GUAR') || cur.includes('FLT TIME') || cur.includes('SEQ ') || cur.includes('BASE ') || cur.includes('SKD ') || cur.includes('ACT ') || cur.includes('DOM '))) {" +
            "            page1Text = cur;" +
            "            break;" +
            "          }" +
            "        }" +
            "        if (!page1Text) {" +
            "          page1Text = st.getString ? st.getString() : '';" +
            "        }" +
            "        var pages = [page1Text];" +
            "        var lastScreen = page1Text;" +
            "        if (!isFinished(page1Text)) {" +
            "          for (var p = 1; p < 10; p++) {" +
            "            await sleep(600);" +
            "            window.sendDecsKey('SHIFT_ENTER');" +
            "            await sleep(350);" +
            "            var upper = (lastScreen || '').toUpperCase();" +
            "            var nextKey = (upper.includes('MORE? (ENTER Y)') || upper.includes('MORE (Y/N)') || upper.includes('MORE? (Y/N)')) ? 'Y' : 'MD';" +
            "            window.sendDecsKey(nextKey);" +
            "            var nextText = '';" +
            "            for (var w = 0; w < 18; w++) {" +
            "              await sleep(200);" +
            "              var cur = st.getString ? st.getString() : '';" +
            "              if (cur && cur.length > 50 && cur !== lastScreen) {" +
            "                nextText = cur;" +
            "                break;" +
            "              }" +
            "            }" +
            "            if (!nextText || nextText === lastScreen) {" +
            "              break;" +
            "            }" +
            "            pages.push(nextText);" +
            "            lastScreen = nextText;" +
            "            if (isFinished(nextText)) {" +
            "              break;" +
            "            }" +
            "          }" +
            "        }" +
            "        var combinedText = pages.join('\\n');" +
            "        if (window.AndroidPortal && window.AndroidPortal.onHiCaptureComplete) {" +
            "          window.AndroidPortal.onHiCaptureComplete(hiCommand, combinedText, pages.length);" +
            "        }" +
            "        resolve({ success: true, text: combinedText, pages: pages.length });" +
            "      })();" +
            "    });" +
            "  };" +
            "  window.captureSingleHssFully = function(hssCommand) {" +
            "    return window.runAutonomousHiCapture(hssCommand);" +
            "  };" +
            "  window.runBatchHssCapture = function(cmdList) {" +
            "    return new Promise(function(resolve) {" +
            "      function sleep(ms) {" +
            "        return new Promise(function(r) { setTimeout(r, ms); });" +
            "      }" +
            "      (async function() {" +
            "        for (var i = 0; i < cmdList.length; i++) {" +
            "          var cmd = cmdList[i];" +
            "          await window.runAutonomousHiCapture(cmd);" +
            "          await sleep(1200);" +
            "        }" +
            "        if (window.AndroidPortal && window.AndroidPortal.onBatchCaptureComplete) {" +
            "          window.AndroidPortal.onBatchCaptureComplete(cmdList.length);" +
            "        }" +
            "        resolve({ success: true, count: cmdList.length });" +
            "      })();" +
            "    });" +
            "  };" +
            "})();";

        portalWebView.evaluateJavascript(script, null);
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
        String label = cmd.equals("CTRL_HOME") ? "⌂ Home (Ctrl+Home)" : (cmd.equals("SHIFT_DELETE") ? "⌧ Clear Page (Shift+Delete)" : (cmd.equals("SHIFT_ENTER") ? "↵ Line Down" : cmd));
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

        Toast.makeText(MainActivity.this, "✓ " + command + " (" + pageCount + " pages) Merged to Calendar!", Toast.LENGTH_SHORT).show();
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
