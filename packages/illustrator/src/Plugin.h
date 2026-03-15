#pragma once

#include "SPBasic.h"
#include "SPInterf.h"
#include "SPAccess.h"
#include "AIPlugin.h"
#include "AIMenu.h"
#include "AIMenuGroups.h"
#include "AIMenuUtils.h"

extern "C" SPBasicSuite *sSPBasic;

ASErr StartupPlugin(SPInterfaceMessage *message);
ASErr ShutdownPlugin(SPInterfaceMessage *message);
