#pragma once

#include "AIArt.h"
#include "AIPath.h"
#include "AIPathStyle.h"
#include <string>
#include <vector>

namespace ArtCreator {
  AIArtHandle CreateRectangle(AIReal x, AIReal y, AIReal w, AIReal h);
  AIArtHandle CreateEllipse(AIReal cx, AIReal cy, AIReal rx, AIReal ry);
  AIArtHandle CreateDiamond(AIReal cx, AIReal cy, AIReal half);
  AIArtHandle CreateGroup();

  void SetFillRGB(AIArtHandle art, AIReal r, AIReal g, AIReal b);
  void SetNoStroke(AIArtHandle art);
  void MoveIntoGroup(AIArtHandle group, AIArtHandle art);

  struct RGB { AIReal r, g, b; };
  RGB HexToRGB(const std::string &hex);

  // Batch: create all shapes for a color in one native call
  struct CellInfo { AIReal cx, cy, half; };
  int BatchCreateShapes(const char *shape, const std::vector<CellInfo> &cells,
                        AIReal r, AIReal g, AIReal b, AIArtHandle group);
}
