#include "SuitePointers.h"
#include "Plugin.h"
#include <fstream>

extern "C" {
  AIArtSuite *sAIArt = nullptr;
  AIPathSuite *sAIPath = nullptr;
  AIPathStyleSuite *sAIPathStyle = nullptr;
  AIUnicodeStringSuite *sAIUnicodeString = nullptr;
  AIAppContextSuite *sAIAppContext = nullptr;
  SPBlocksSuite *sSPBlocks = nullptr;
}

SPPluginRef gDitherPluginRef = nullptr;

static void log(const char *msg) {
  std::ofstream f("/tmp/dither_plugin_debug.log", std::ios::app);
  f << msg << std::endl;
}

ASErr SuitePointers::Acquire() {
  const void *s;

  s = nullptr; sSPBasic->AcquireSuite(kAIArtSuite, kAIArtSuiteVersion, &s);
  sAIArt = (AIArtSuite *)s;
  log(sAIArt ? "OK: AIArtSuite" : "FAILED: AIArtSuite");

  s = nullptr; sSPBasic->AcquireSuite(kAIPathSuite, kAIPathSuiteVersion, &s);
  sAIPath = (AIPathSuite *)s;

  s = nullptr; sSPBasic->AcquireSuite(kAIPathStyleSuite, kAIPathStyleSuiteVersion, &s);
  sAIPathStyle = (AIPathStyleSuite *)s;

  s = nullptr; sSPBasic->AcquireSuite(kAIAppContextSuite, kAIAppContextSuiteVersion, &s);
  sAIAppContext = (AIAppContextSuite *)s;
  log(sAIAppContext ? "OK: AIAppContextSuite" : "FAILED: AIAppContextSuite");

  s = nullptr; sSPBasic->AcquireSuite(kAIUnicodeStringSuite, kAIUnicodeStringSuiteVersion, &s);
  sAIUnicodeString = (AIUnicodeStringSuite *)s;

  s = nullptr; sSPBasic->AcquireSuite(kSPBlocksSuite, kSPBlocksSuiteVersion, &s);
  sSPBlocks = (SPBlocksSuite *)s;

  return kNoErr;
}

void SuitePointers::Release() {
  if (sAIArt) sSPBasic->ReleaseSuite(kAIArtSuite, kAIArtSuiteVersion);
  if (sAIPath) sSPBasic->ReleaseSuite(kAIPathSuite, kAIPathSuiteVersion);
  if (sAIPathStyle) sSPBasic->ReleaseSuite(kAIPathStyleSuite, kAIPathStyleSuiteVersion);
  if (sAIAppContext) sSPBasic->ReleaseSuite(kAIAppContextSuite, kAIAppContextSuiteVersion);
  if (sAIUnicodeString) sSPBasic->ReleaseSuite(kAIUnicodeStringSuite, kAIUnicodeStringSuiteVersion);
  if (sSPBlocks) sSPBasic->ReleaseSuite(kSPBlocksSuite, kSPBlocksSuiteVersion);
  sAIArt = nullptr;
  sAIPath = nullptr;
  sAIPathStyle = nullptr;
  sAIAppContext = nullptr;
  sAIUnicodeString = nullptr;
  sSPBlocks = nullptr;
}
