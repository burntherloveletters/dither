// Dither — Adobe Illustrator Plugin

#include "Plugin.h"
#include "SuitePointers.h"
#include "DitherPanel.h"

#include <cstring>
#include <fstream>

extern "C" {
  SPBasicSuite *sSPBasic = nullptr;
}

static SPPluginRef gPluginRef = nullptr;
static AIMenuSuite *sAIMenu = nullptr;
static AIMenuItemHandle gDitherMenuItem = nullptr;

static void debugLog(const char *msg) {
  std::ofstream f("/tmp/dither_plugin_debug.log", std::ios::app);
  f << msg << std::endl;
}

extern "C" ASAPI ASErr PluginMain(char *caller, char *selector, void *message) {
  ASErr error = kNoErr;

  debugLog("PluginMain called");
  debugLog(caller);
  debugLog(selector);

  if (std::strcmp(caller, kSPInterfaceCaller) == 0) {
    if (std::strcmp(selector, kSPInterfaceStartupSelector) == 0) {
      error = StartupPlugin(static_cast<SPInterfaceMessage *>(message));
    } else if (std::strcmp(selector, kSPInterfaceShutdownSelector) == 0) {
      error = ShutdownPlugin(static_cast<SPInterfaceMessage *>(message));
    }
  }
  else if (std::strcmp(caller, kSPAccessCaller) == 0) {
    debugLog("Access caller");
  }
  else if (std::strcmp(caller, kCallerAIMenu) == 0) {
    debugLog("Menu caller!");
    AIMenuMessage *menuMsg = static_cast<AIMenuMessage *>(message);
    if (menuMsg->menuItem == gDitherMenuItem) {
      debugLog("Dither menu item clicked!");
      DitherPanel::Toggle();
    }
  }

  return error;
}

ASErr StartupPlugin(SPInterfaceMessage *message) {
  debugLog("StartupPlugin called");
  sSPBasic = message->d.basic;
  gPluginRef = message->d.self;
  gDitherPluginRef = message->d.self;

  // Acquire menu suite
  {
    const void *suite = nullptr;
    ASErr err = sSPBasic->AcquireSuite(kAIMenuSuite, kAIMenuSuiteVersion, &suite);
    if (err != kNoErr || !suite) {
      debugLog("Failed to acquire menu suite");
      return kNoErr; // Don't fail startup
    }
    sAIMenu = const_cast<AIMenuSuite *>(static_cast<const AIMenuSuite *>(suite));
    debugLog("Menu suite acquired");
  }

  SuitePointers::Acquire();
  debugLog("Suites acquired");

  // Add menu item
  AIPlatformAddMenuItemDataUS menuData;
  menuData.groupName = kWindowUtilsMenuGroup;
  menuData.itemText = ai::UnicodeString("Dither");

  ASErr menuErr = sAIMenu->AddMenuItem(
    gPluginRef,
    "Dither Panel",
    &menuData,
    0,
    &gDitherMenuItem
  );

  if (menuErr != kNoErr) {
    char buf[64];
    snprintf(buf, sizeof(buf), "AddMenuItem failed: %d", menuErr);
    debugLog(buf);
  } else {
    debugLog("Menu item added successfully");
  }

  debugLog("StartupPlugin complete");
  return kNoErr;
}

ASErr ShutdownPlugin(SPInterfaceMessage *message) {
  debugLog("ShutdownPlugin called");
  DitherPanel::Destroy();
  SuitePointers::Release();
  if (sAIMenu) {
    sSPBasic->ReleaseSuite(kAIMenuSuite, kAIMenuSuiteVersion);
    sAIMenu = nullptr;
  }
  return kNoErr;
}
