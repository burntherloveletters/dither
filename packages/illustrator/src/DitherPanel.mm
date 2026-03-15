// DitherPanel — Floating NSPanel with WKWebView
// Bridges JavaScript calls from the dither UI to ArtCreator C++ functions.

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

#include "DitherPanel.h"
#include "ArtCreator.h"
#include "SuitePointers.h"
#include "Plugin.h"

#include <string>
#include <sstream>

// ── Bridge Message Handler ──────────────────────────────────
// Receives JSON messages from JS via:
//   window.webkit.messageHandlers.dither.postMessage(jsonString)

@interface DitherBridge : NSObject <WKScriptMessageHandler>
@property (nonatomic, weak) WKWebView *webView;
@end

@implementation DitherBridge

- (void)userContentController:(WKUserContentController *)controller
      didReceiveScriptMessage:(WKScriptMessage *)message {

  if (![message.body isKindOfClass:[NSString class]]) return;

  NSData *data = [(NSString *)message.body dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *msg = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
  if (!msg) return;

  NSNumber *callId = msg[@"id"];
  NSString *action = msg[@"action"];
  NSDictionary *params = msg[@"params"];

  // Push AppContext so SDK calls work outside PluginMain
  AIAppContextHandle appContext = nullptr;
  if (sAIAppContext && gDitherPluginRef) {
    sAIAppContext->PushAppContext(gDitherPluginRef, &appContext);
  }

  // Dispatch to ArtCreator
  NSString *resultJSON = [self handleAction:action params:params];

  // Pop AppContext
  if (appContext) {
    sAIAppContext->PopAppContext(appContext);
  }

  // Return result to JS
  NSString *js = [NSString stringWithFormat:
    @"window._ditherResolve(%@, %@)", callId, resultJSON];
  [self.webView evaluateJavaScript:js completionHandler:nil];
}

- (NSString *)handleAction:(NSString *)action params:(NSDictionary *)p {
  // ── Shape Creation ──────────────────────────────────────
  if ([action isEqualToString:@"createRect"]) {
    AIReal x = [p[@"x"] doubleValue];
    AIReal y = [p[@"y"] doubleValue];
    AIReal w = [p[@"w"] doubleValue];
    AIReal h = [p[@"h"] doubleValue];
    AIArtHandle art = ArtCreator::CreateRectangle(x, y, w, h);
    return [self handleResult:art];
  }

  if ([action isEqualToString:@"createEllipse"]) {
    AIReal cx = [p[@"cx"] doubleValue];
    AIReal cy = [p[@"cy"] doubleValue];
    AIReal rx = [p[@"rx"] doubleValue];
    AIReal ry = [p[@"ry"] doubleValue];
    AIArtHandle art = ArtCreator::CreateEllipse(cx, cy, rx, ry);
    return [self handleResult:art];
  }

  if ([action isEqualToString:@"createDiamond"]) {
    AIReal cx = [p[@"cx"] doubleValue];
    AIReal cy = [p[@"cy"] doubleValue];
    AIReal half = [p[@"half"] doubleValue];
    AIArtHandle art = ArtCreator::CreateDiamond(cx, cy, half);
    return [self handleResult:art];
  }

  if ([action isEqualToString:@"createGroup"]) {
    AIArtHandle group = ArtCreator::CreateGroup();
    return [self handleResult:group];
  }

  // ── Styling ─────────────────────────────────────────────
  if ([action isEqualToString:@"setFill"]) {
    AIArtHandle art = (AIArtHandle)(uintptr_t)[p[@"handle"] unsignedLongLongValue];
    NSString *hex = p[@"color"];
    auto rgb = ArtCreator::HexToRGB([hex UTF8String]);
    ArtCreator::SetFillRGB(art, rgb.r, rgb.g, rgb.b);
    ArtCreator::SetNoStroke(art);
    return @"{\"ok\":true}";
  }

  // ── Grouping ────────────────────────────────────────────
  if ([action isEqualToString:@"moveIntoGroup"]) {
    AIArtHandle group = (AIArtHandle)(uintptr_t)[p[@"group"] unsignedLongLongValue];
    AIArtHandle art   = (AIArtHandle)(uintptr_t)[p[@"art"] unsignedLongLongValue];
    ArtCreator::MoveIntoGroup(group, art);
    return @"{\"ok\":true}";
  }

  // ── Batch Creation ─────────────────────────────────────
  if ([action isEqualToString:@"batchCreate"]) {
    NSString *shape = p[@"shape"];
    NSString *color = p[@"color"];
    NSArray *cells = p[@"cells"];
    auto rgb = ArtCreator::HexToRGB([color UTF8String]);

    AIArtHandle group = ArtCreator::CreateGroup();
    if (!group) return @"{\"error\":\"failed to create group\"}";

    std::vector<ArtCreator::CellInfo> cellVec;
    cellVec.reserve([cells count]);
    for (NSArray *c in cells) {
      ArtCreator::CellInfo ci;
      ci.cx   = [c[0] doubleValue];
      ci.cy   = [c[1] doubleValue];
      ci.half = [c[2] doubleValue];
      cellVec.push_back(ci);
    }

    int count = ArtCreator::BatchCreateShapes(
      [shape UTF8String], cellVec, rgb.r, rgb.g, rgb.b, group);

    return [NSString stringWithFormat:@"{\"ok\":true,\"count\":%d}", count];
  }

  // ── Ping (connection check) ─────────────────────────────
  if ([action isEqualToString:@"ping"]) {
    return @"{\"ok\":true,\"plugin\":\"Dither\"}";
  }

  return @"{\"error\":\"unknown action\"}";
}

- (NSString *)handleResult:(AIArtHandle)art {
  if (!art) return @"{\"error\":\"failed to create art\"}";
  // Pass the handle as a numeric pointer so JS can reference it later
  return [NSString stringWithFormat:@"{\"handle\":%llu}",
    (unsigned long long)(uintptr_t)art];
}

@end

// ── Panel Window ────────────────────────────────────────────
static NSPanel *sPanel = nil;
static WKWebView *sWebView = nil;
static DitherBridge *sBridge = nil;

static void CreatePanel() {
  if (sPanel) return;

  // Panel frame — floating palette style
  NSRect frame = NSMakeRect(100, 100, 300, 780);
  NSUInteger style = NSWindowStyleMaskTitled
                   | NSWindowStyleMaskClosable
                   | NSWindowStyleMaskResizable
                   | NSWindowStyleMaskUtilityWindow;

  sPanel = [[NSPanel alloc] initWithContentRect:frame
                                      styleMask:style
                                        backing:NSBackingStoreBuffered
                                          defer:NO];
  sPanel.title = @"Dither";
  sPanel.floatingPanel = YES;
  sPanel.becomesKeyOnlyIfNeeded = YES;
  sPanel.level = NSFloatingWindowLevel;
  sPanel.minSize = NSMakeSize(280, 400);

  // Dark appearance to match Illustrator
  sPanel.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];

  // Set up WKWebView with message handler
  WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
  WKUserContentController *userContent = [[WKUserContentController alloc] init];

  sBridge = [[DitherBridge alloc] init];
  [userContent addScriptMessageHandler:sBridge name:@"dither"];
  config.userContentController = userContent;

  sWebView = [[WKWebView alloc] initWithFrame:sPanel.contentView.bounds
                                configuration:config];
  sWebView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  sBridge.webView = sWebView;

  // Load UI from plugin bundle resources
  NSBundle *pluginBundle = [NSBundle bundleForClass:[DitherBridge class]];
  NSURL *uiDir = [pluginBundle URLForResource:@"ui" withExtension:nil];

  if (uiDir) {
    NSURL *htmlURL = [uiDir URLByAppendingPathComponent:@"index.html"];
    [sWebView loadFileURL:htmlURL allowingReadAccessToURL:uiDir];
  } else {
    // Fallback: try relative path during development
    NSString *devPath = @"/Users/joshpigford/Development/dither/packages/illustrator/ui";
    NSURL *devURL = [NSURL fileURLWithPath:devPath];
    NSURL *htmlURL = [devURL URLByAppendingPathComponent:@"index.html"];
    [sWebView loadFileURL:htmlURL allowingReadAccessToURL:devURL];
  }

  [sPanel.contentView addSubview:sWebView];
}

// ── Public API ──────────────────────────────────────────────
namespace DitherPanel {

void Toggle() {
  CreatePanel();
  if (sPanel.isVisible) {
    [sPanel orderOut:nil];
  } else {
    [sPanel makeKeyAndOrderFront:nil];
  }
}

void Destroy() {
  if (sPanel) {
    [sPanel close];
    sPanel = nil;
    sWebView = nil;
    sBridge = nil;
  }
}

} // namespace DitherPanel
