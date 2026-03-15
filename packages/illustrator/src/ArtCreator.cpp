#include "ArtCreator.h"
#include "SuitePointers.h"
#include <cstdlib>
#include <fstream>

static void artLog(const char *msg) {
  std::ofstream f("/tmp/dither_plugin_debug.log", std::ios::app);
  f << msg << std::endl;
}

namespace ArtCreator {

AIArtHandle CreateRectangle(AIReal x, AIReal y, AIReal w, AIReal h) {
  if (!sAIArt) { artLog("CreateRect: sAIArt is NULL"); return nullptr; }
  AIArtHandle art = nullptr;
  ASErr err = sAIArt->NewArt(kPathArt, kPlaceAboveAll, nullptr, &art);
  if (err != kNoErr || !art) {
    char buf[128];
    snprintf(buf, sizeof(buf), "CreateRect FAILED: err=%d art=%p", err, (void*)art);
    artLog(buf);
    return nullptr;
  }
  artLog("CreateRect OK");

  AIPathSegment segs[4];
  segs[0].p.h = x;     segs[0].p.v = y;
  segs[0].in = segs[0].out = segs[0].p; segs[0].corner = true;
  segs[1].p.h = x + w; segs[1].p.v = y;
  segs[1].in = segs[1].out = segs[1].p; segs[1].corner = true;
  segs[2].p.h = x + w; segs[2].p.v = y + h;
  segs[2].in = segs[2].out = segs[2].p; segs[2].corner = true;
  segs[3].p.h = x;     segs[3].p.v = y + h;
  segs[3].in = segs[3].out = segs[3].p; segs[3].corner = true;

  sAIPath->SetPathSegmentCount(art, 4);
  sAIPath->SetPathSegments(art, 0, 4, segs);
  sAIPath->SetPathClosed(art, true);
  return art;
}

AIArtHandle CreateEllipse(AIReal cx, AIReal cy, AIReal rx, AIReal ry) {
  AIArtHandle art = nullptr;
  ASErr err = sAIArt->NewArt(kPathArt, kPlaceAboveAll, nullptr, &art);
  if (err != kNoErr || !art) return nullptr;

  const AIReal k = 0.5522847;
  AIPathSegment segs[4];

  segs[0].p.h = cx + rx;  segs[0].p.v = cy;
  segs[0].in.h = cx + rx; segs[0].in.v = cy + ry * k;
  segs[0].out.h = cx + rx; segs[0].out.v = cy - ry * k;
  segs[0].corner = false;

  segs[1].p.h = cx;        segs[1].p.v = cy + ry;
  segs[1].in.h = cx + rx * k; segs[1].in.v = cy + ry;
  segs[1].out.h = cx - rx * k; segs[1].out.v = cy + ry;
  segs[1].corner = false;

  segs[2].p.h = cx - rx;  segs[2].p.v = cy;
  segs[2].in.h = cx - rx; segs[2].in.v = cy + ry * k;
  segs[2].out.h = cx - rx; segs[2].out.v = cy - ry * k;
  segs[2].corner = false;

  segs[3].p.h = cx;        segs[3].p.v = cy - ry;
  segs[3].in.h = cx - rx * k; segs[3].in.v = cy - ry;
  segs[3].out.h = cx + rx * k; segs[3].out.v = cy - ry;
  segs[3].corner = false;

  sAIPath->SetPathSegmentCount(art, 4);
  sAIPath->SetPathSegments(art, 0, 4, segs);
  sAIPath->SetPathClosed(art, true);
  return art;
}

AIArtHandle CreateDiamond(AIReal cx, AIReal cy, AIReal half) {
  AIArtHandle art = nullptr;
  ASErr err = sAIArt->NewArt(kPathArt, kPlaceAboveAll, nullptr, &art);
  if (err != kNoErr || !art) return nullptr;

  AIPathSegment segs[4];
  segs[0].p.h = cx;        segs[0].p.v = cy + half;
  segs[0].in = segs[0].out = segs[0].p; segs[0].corner = true;
  segs[1].p.h = cx + half; segs[1].p.v = cy;
  segs[1].in = segs[1].out = segs[1].p; segs[1].corner = true;
  segs[2].p.h = cx;        segs[2].p.v = cy - half;
  segs[2].in = segs[2].out = segs[2].p; segs[2].corner = true;
  segs[3].p.h = cx - half; segs[3].p.v = cy;
  segs[3].in = segs[3].out = segs[3].p; segs[3].corner = true;

  sAIPath->SetPathSegmentCount(art, 4);
  sAIPath->SetPathSegments(art, 0, 4, segs);
  sAIPath->SetPathClosed(art, true);
  return art;
}

AIArtHandle CreateGroup() {
  AIArtHandle group = nullptr;
  sAIArt->NewArt(kGroupArt, kPlaceAboveAll, nullptr, &group);
  return group;
}

void SetFillRGB(AIArtHandle art, AIReal r, AIReal g, AIReal b) {
  if (!art) return;
  AIPathStyle style;
  AIBoolean hasAdvFill = false;
  sAIPathStyle->GetPathStyle(art, &style, &hasAdvFill);
  style.fillPaint = true;
  style.fill.color.kind = kThreeColor;
  style.fill.color.c.rgb.red   = r;
  style.fill.color.c.rgb.green = g;
  style.fill.color.c.rgb.blue  = b;
  style.fill.overprint = false;
  sAIPathStyle->SetPathStyle(art, &style);
}

void SetNoStroke(AIArtHandle art) {
  if (!art) return;
  AIPathStyle style;
  AIBoolean hasAdvFill = false;
  sAIPathStyle->GetPathStyle(art, &style, &hasAdvFill);
  style.strokePaint = false;
  sAIPathStyle->SetPathStyle(art, &style);
}

void MoveIntoGroup(AIArtHandle group, AIArtHandle art) {
  if (!group || !art) return;
  sAIArt->ReorderArt(art, 4, group); // kPlaceInsideOnTop
}

RGB HexToRGB(const std::string &hex) {
  RGB c = {0, 0, 0};
  const char *s = hex.c_str();
  if (*s == '#') s++;
  unsigned int r, g, b;
  if (sscanf(s, "%02x%02x%02x", &r, &g, &b) == 3) {
    c.r = r / 255.0;
    c.g = g / 255.0;
    c.b = b / 255.0;
  }
  return c;
}

int BatchCreateShapes(const char *shape, const std::vector<CellInfo> &cells,
                      AIReal r, AIReal g, AIReal b, AIArtHandle group) {
  int count = 0;
  bool isCircle = (strcmp(shape, "circle") == 0);
  bool isDiamond = (strcmp(shape, "diamond") == 0);

  for (const auto &cell : cells) {
    AIArtHandle art = nullptr;
    if (isCircle) {
      art = CreateEllipse(cell.cx, cell.cy, cell.half, cell.half);
    } else if (isDiamond) {
      art = CreateDiamond(cell.cx, cell.cy, cell.half);
    } else {
      art = CreateRectangle(cell.cx - cell.half, cell.cy - cell.half,
                            cell.half * 2, cell.half * 2);
    }
    if (!art) continue;
    SetFillRGB(art, r, g, b);
    SetNoStroke(art);
    MoveIntoGroup(group, art);
    count++;
  }
  return count;
}

} // namespace ArtCreator
