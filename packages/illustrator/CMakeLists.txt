cmake_minimum_required(VERSION 3.20)
project(Dither VERSION 1.0.0 LANGUAGES CXX OBJCXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT AI_SDK_PATH)
  message(FATAL_ERROR "AI_SDK_PATH not set.\n  cmake -B build -DAI_SDK_PATH=/path/to/IllustratorSDK")
endif()

if(NOT APPLE)
  message(FATAL_ERROR "macOS only.")
endif()

set(CMAKE_OSX_DEPLOYMENT_TARGET "10.15" CACHE STRING "")
set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "")

set(PLUGIN_NAME "Dither")

# ── Sources (standalone, no SDK framework) ───────────────────
add_library(${PLUGIN_NAME} MODULE
  src/Plugin.cpp
  src/SuitePointers.cpp
  src/ArtCreator.cpp
  src/DitherPanel.mm
  # SDK source needed for ai::UnicodeString
  "${AI_SDK_PATH}/illustratorapi/illustrator/IAIUnicodeString.cpp"
)

target_include_directories(${PLUGIN_NAME} PRIVATE
  "${AI_SDK_PATH}/illustratorapi/ate"
  "${AI_SDK_PATH}/illustratorapi/illustrator"
  "${AI_SDK_PATH}/illustratorapi/illustrator/actions"
  "${AI_SDK_PATH}/illustratorapi/pica_sp"
  src
)

target_compile_definitions(${PLUGIN_NAME} PRIVATE
  MAC_ENV
  __MACH__
  ILLUSTRATOR_PLUGIN
)

target_link_libraries(${PLUGIN_NAME} PRIVATE
  "-framework CoreFoundation"
  "-framework CoreServices"
  "-framework ApplicationServices"
  "-framework Cocoa"
  "-framework WebKit"
)

set_source_files_properties(src/DitherPanel.mm PROPERTIES
  COMPILE_FLAGS "-fobjc-arc"
)

# ── Bundle ───────────────────────────────────────────────────
set_target_properties(${PLUGIN_NAME} PROPERTIES
  BUNDLE TRUE
  BUNDLE_EXTENSION "aip"
  MACOSX_BUNDLE TRUE
  MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/Info.plist.in"
)

# ── PiPL via Rez ────────────────────────────────────────────
find_program(REZ_EXECUTABLE Rez HINTS /usr/bin)
add_custom_command(TARGET ${PLUGIN_NAME} POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E make_directory
    "$<TARGET_BUNDLE_CONTENT_DIR:${PLUGIN_NAME}>/Resources"
  COMMAND ${REZ_EXECUTABLE}
    "-d" "TargetOS_Mac=1"
    "-i" "${CMAKE_CURRENT_SOURCE_DIR}/tools"
    "-i" "${AI_SDK_PATH}/illustratorapi/pica_sp"
    "-i" "${AI_SDK_PATH}/illustratorapi/illustrator"
    "-useDF"
    "-o" "$<TARGET_BUNDLE_CONTENT_DIR:${PLUGIN_NAME}>/Resources/${PLUGIN_NAME}.rsrc"
    "${CMAKE_CURRENT_SOURCE_DIR}/tools/Dither.r"
  COMMENT "Compiling PiPL with Rez"
  VERBATIM
)

# ── Copy UI into bundle ─────────────────────────────────────
add_custom_command(TARGET ${PLUGIN_NAME} POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E make_directory
    "$<TARGET_BUNDLE_CONTENT_DIR:${PLUGIN_NAME}>/Resources/ui"
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "${CMAKE_CURRENT_SOURCE_DIR}/ui/index.html"
    "${CMAKE_CURRENT_SOURCE_DIR}/ui/main.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/ui/favicon.svg"
    "$<TARGET_BUNDLE_CONTENT_DIR:${PLUGIN_NAME}>/Resources/ui/"
  COMMENT "Copying UI resources"
)

message(STATUS "Plugin: ${PLUGIN_NAME}.aip (standalone, no SDK framework)")
message(STATUS "SDK: ${AI_SDK_PATH}")
