#pragma once

#include "AIArt.h"
#include "AIPath.h"
#include "AIPathStyle.h"
#include "AIUnicodeString.h"
#include "AIContext.h"
#include "SPBlocks.h"

extern "C" AIArtSuite *sAIArt;
extern "C" AIPathSuite *sAIPath;
extern "C" AIPathStyleSuite *sAIPathStyle;
extern "C" AIUnicodeStringSuite *sAIUnicodeString;
extern "C" AIAppContextSuite *sAIAppContext;
extern "C" SPBlocksSuite *sSPBlocks;

// Store plugin ref for AppContext
extern SPPluginRef gDitherPluginRef;

namespace SuitePointers {
  ASErr Acquire();
  void Release();
}
