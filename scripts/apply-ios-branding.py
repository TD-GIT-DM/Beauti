#!/usr/bin/env python3
"""Copy placeholder icons/splash and App Store-oriented Info.plist keys into ios/."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IOS_APP = ROOT / "ios" / "App" / "App"
ASSETS = IOS_APP / "Assets.xcassets"
INFO = IOS_APP / "Info.plist"
STORYBOARD = IOS_APP / "Base.lproj" / "LaunchScreen.storyboard"
PBXPROJ = ROOT / "ios" / "App" / "App.xcodeproj" / "project.pbxproj"
ICON_1024 = ROOT / "resources" / "ios" / "AppIcon.appiconset" / "AppIcon-1024.png"
SPLASH = ROOT / "resources" / "splash.png"

PLIST_KEYS = """
	<key>UIStatusBarStyle</key>
	<string>UIStatusBarStyleLightContent</string>
	<key>UIStatusBarHidden</key>
	<false/>
	<key>ITSAppUsesNonExemptEncryption</key>
	<false/>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<false/>
	</dict>"""

PRIVACY_XML = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyTrackingDomains</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array>
		<dict>
			<key>NSPrivacyCollectedDataType</key>
			<string>NSPrivacyCollectedDataTypeUserID</string>
			<key>NSPrivacyCollectedDataTypeLinked</key>
			<false/>
			<key>NSPrivacyCollectedDataTypeTracking</key>
			<false/>
			<key>NSPrivacyCollectedDataTypePurposes</key>
			<array>
				<string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
			</array>
		</dict>
		<dict>
			<key>NSPrivacyCollectedDataType</key>
			<string>NSPrivacyCollectedDataTypeProductInteraction</string>
			<key>NSPrivacyCollectedDataTypeLinked</key>
			<false/>
			<key>NSPrivacyCollectedDataTypeTracking</key>
			<false/>
			<key>NSPrivacyCollectedDataTypePurposes</key>
			<array>
				<string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
			</array>
		</dict>
	</array>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
"""


def copy_assets() -> None:
    icon_dir = ASSETS / "AppIcon.appiconset"
    splash_dir = ASSETS / "Splash.imageset"
    icon_dir.mkdir(parents=True, exist_ok=True)
    splash_dir.mkdir(parents=True, exist_ok=True)
    if ICON_1024.exists():
        shutil.copy2(ICON_1024, icon_dir / "AppIcon-512@2x.png")
        print(f"Copied App Icon 1024 → {icon_dir / 'AppIcon-512@2x.png'}")
    if SPLASH.exists():
        for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
            shutil.copy2(SPLASH, splash_dir / name)
        print(f"Copied splash into {splash_dir}")


def patch_plist() -> None:
    if not INFO.exists():
        print("No ios/App/App/Info.plist yet. Run `npx cap add ios` on a Mac first.", file=sys.stderr)
        return
    text = INFO.read_text()
    if "ITSAppUsesNonExemptEncryption" in text and "NSAppTransportSecurity" in text:
        print(f"{INFO} already has ATS / status bar / export compliance keys")
        return
    needle = "\t<key>UIViewControllerBasedStatusBarAppearance</key>\n\t<true/>"
    if needle in text and "NSAppTransportSecurity" not in text:
        text = text.replace(needle, needle + "\n" + PLIST_KEYS, 1)
        INFO.write_text(text)
        print(f"Patched {INFO}")
        return
    if "</dict>\n</plist>" in text:
        INFO.write_text(text.replace("</dict>\n</plist>", f"{PLIST_KEYS}\n</dict>\n</plist>", 1))
        print(f"Patched {INFO} (fallback insert)")
        return
    print(f"Could not patch {INFO}", file=sys.stderr)


def patch_launch_storyboard() -> None:
    if not STORYBOARD.exists():
        return
    text = STORYBOARD.read_text()
    dark = '<color key="backgroundColor" red="0.027450980392156862" green="0.027450980392156862" blue="0.027450980392156862" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>'
    text = text.replace('appearance="light"', 'appearance="dark"')
    text = text.replace(
        '<color key="backgroundColor" systemColor="systemBackgroundColor"/>',
        dark,
    )
    STORYBOARD.write_text(text)
    print(f"Patched {STORYBOARD} for dark-gold splash")


def write_privacy_manifest() -> None:
    dest = IOS_APP / "PrivacyInfo.xcprivacy"
    dest.write_text(PRIVACY_XML)
    print(f"Wrote {dest}")


def patch_pbxproj() -> None:
    if not PBXPROJ.exists():
        return
    text = PBXPROJ.read_text()
    if "PrivacyInfo.xcprivacy" in text:
        print("Xcode project already references PrivacyInfo.xcprivacy")
        return
    text = text.replace(
        "/* Begin PBXBuildFile section */\n",
        "/* Begin PBXBuildFile section */\n\t\tB1A0BEA700000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = B1A0BEA700000002 /* PrivacyInfo.xcprivacy */; };\n",
        1,
    )
    text = text.replace(
        "/* Begin PBXFileReference section */\n",
        "/* Begin PBXFileReference section */\n\t\tB1A0BEA700000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = \"<group>\"; };\n",
        1,
    )
    text = text.replace(
        "\t\t\t\t504EC3131FED79650016851F /* Info.plist */,\n",
        "\t\t\t\t504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\tB1A0BEA700000002 /* PrivacyInfo.xcprivacy */,\n",
        1,
    )
    text = text.replace(
        "\t\t\t\t504EC30F1FED79650016851F /* Assets.xcassets in Resources */,\n",
        "\t\t\t\t504EC30F1FED79650016851F /* Assets.xcassets in Resources */,\n\t\t\t\tB1A0BEA700000001 /* PrivacyInfo.xcprivacy in Resources */,\n",
        1,
    )
    PBXPROJ.write_text(text)
    print(f"Patched {PBXPROJ} to include PrivacyInfo.xcprivacy")


def main() -> int:
    if not (ROOT / "ios").exists():
        print("ios/ is not generated yet. Icons live in resources/ios/; run npm run ios:add on a Mac.")
        return 0
    copy_assets()
    patch_plist()
    patch_launch_storyboard()
    write_privacy_manifest()
    patch_pbxproj()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
