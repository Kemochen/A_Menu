import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../native/", import.meta.url));
const objects = {};
const id = (name) => createHash("sha1").update(name).digest("hex").slice(0, 24).toUpperCase();
function object(name, value) { const key = id(name); objects[key] = value; return key; }
function ref(name, path, type, tree = "<group>") { return object(name, { isa: "PBXFileReference", lastKnownFileType: type, path, sourceTree: tree }); }
const app = id("app-target");
const products = [ref("app-product", "AMenu.app", "wrapper.application", "BUILT_PRODUCTS_DIR"),
  ref("unit-product", "AMenuTests.xctest", "wrapper.cfbundle", "BUILT_PRODUCTS_DIR"),
  ref("ui-product", "AMenuUITests.xctest", "wrapper.cfbundle", "BUILT_PRODUCTS_DIR")];
const appFiles = readdirSync(join(root, "App")).filter((name) => name.endsWith(".swift")).sort();
const testFiles = ["MenuCoreTests.swift", "MenuAPITests.swift"];
const swiftRefs = (names, prefix) => names.map((name) => ref(`${prefix}-${name}`, name, "sourcecode.swift"));
const appRefs = swiftRefs(appFiles, "app");
const unitRefs = swiftRefs(testFiles, "test");
const uiRefs = swiftRefs(["AMenuUITests.swift"], "ui");
const info = ref("info", "Info.plist", "text.plist.xml");
const resources = [ref("recipes", "recipes.json", "text.json"), ref("photos", "Photos", "folder"), ref("assets", "Assets.xcassets", "folder.assetcatalog"), ref("privacy", "PrivacyInfo.xcprivacy", "text.plist.xml")];
const groups = [
  object("app-group", { isa: "PBXGroup", children: [...appRefs, info], path: "App", sourceTree: "<group>" }),
  object("resources-group", { isa: "PBXGroup", children: resources, path: "Resources", sourceTree: "<group>" }),
  object("tests-group", { isa: "PBXGroup", children: unitRefs, path: "Tests", sourceTree: "<group>" }),
  object("ui-group", { isa: "PBXGroup", children: uiRefs, path: "UITests", sourceTree: "<group>" }),
  object("products-group", { isa: "PBXGroup", children: products, name: "Products", sourceTree: "<group>" })
];
const main = object("main-group", { isa: "PBXGroup", children: groups, sourceTree: "<group>" });

function configurations(name, settings) {
  const configurations = ["Debug", "Release"].map((configuration) => object(`${name}-${configuration}`, {
    isa: "XCBuildConfiguration", name: configuration, buildSettings: {
      ...settings, SWIFT_OPTIMIZATION_LEVEL: configuration === "Debug" ? "-Onone" : "-O",
      ...(configuration === "Debug" ? { SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG", ENABLE_TESTABILITY: "YES" } : {})
    }
  }));
  return object(`${name}-configurations`, { isa: "XCConfigurationList", buildConfigurations: configurations, defaultConfigurationIsVisible: 0, defaultConfigurationName: "Release" });
}
function phase(name, isa, refs) {
  return object(name, { isa, buildActionMask: 2147483647, files: refs.map((fileRef) => object(`${name}-${fileRef}`, { isa: "PBXBuildFile", fileRef })), runOnlyForDeploymentPostprocessing: 0 });
}
function dependency(name) {
  const proxy = object(`${name}-proxy`, { isa: "PBXContainerItemProxy", containerPortal: id("project"), proxyType: 1, remoteGlobalIDString: app, remoteInfo: "AMenu" });
  return object(`${name}-dependency`, { isa: "PBXTargetDependency", target: app, targetProxy: proxy });
}
const common = { PRODUCT_NAME: "$(TARGET_NAME)", SWIFT_VERSION: "5.0", IPHONEOS_DEPLOYMENT_TARGET: "15.0", TARGETED_DEVICE_FAMILY: "1,2", CODE_SIGN_STYLE: "Automatic", ENABLE_BITCODE: "NO" };
function target(name, key, product, sourceRefs, resourceRefs, settings, type, dependencies) {
  return object(key, { isa: "PBXNativeTarget", name, productName: name, productReference: product, productType: type,
    buildConfigurationList: configurations(key, { ...common, ...settings }),
    buildPhases: [phase(`${key}-sources`, "PBXSourcesBuildPhase", sourceRefs), phase(`${key}-frameworks`, "PBXFrameworksBuildPhase", []), phase(`${key}-resources`, "PBXResourcesBuildPhase", resourceRefs)], buildRules: [], dependencies });
}
target("AMenu", "app-target", products[0], appRefs, resources, { PRODUCT_BUNDLE_IDENTIFIER: "com.kemochen.amenu", INFOPLIST_FILE: "App/Info.plist", ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon" }, "com.apple.product-type.application", []);
const unit = target("AMenuTests", "unit-target", products[1], unitRefs, [], { PRODUCT_BUNDLE_IDENTIFIER: "com.kemochen.amenu.tests", GENERATE_INFOPLIST_FILE: "YES", TEST_HOST: "$(BUILT_PRODUCTS_DIR)/AMenu.app/AMenu", BUNDLE_LOADER: "$(TEST_HOST)" }, "com.apple.product-type.bundle.unit-test", [dependency("unit")]);
const ui = target("AMenuUITests", "ui-target", products[2], uiRefs, [], { PRODUCT_BUNDLE_IDENTIFIER: "com.kemochen.amenu.uitests", GENERATE_INFOPLIST_FILE: "YES", TEST_TARGET_NAME: "AMenu" }, "com.apple.product-type.bundle.ui-testing", [dependency("ui")]);
object("project", { isa: "PBXProject", attributes: { BuildIndependentTargetsInParallel: "YES", LastUpgradeCheck: "1320", TargetAttributes: { [app]: { CreatedOnToolsVersion: "13.2.1" }, [unit]: { CreatedOnToolsVersion: "13.2.1", TestTargetID: app }, [ui]: { CreatedOnToolsVersion: "13.2.1", TestTargetID: app } } },
  buildConfigurationList: configurations("project", { SDKROOT: "iphoneos", CLANG_ENABLE_MODULES: "YES", CLANG_ENABLE_OBJC_ARC: "YES", IPHONEOS_DEPLOYMENT_TARGET: "15.0" }),
  compatibilityVersion: "Xcode 13.0", developmentRegion: "zh_CN", hasScannedForEncodings: 0, knownRegions: ["zh_CN", "en", "Base"], mainGroup: main,
  productRefGroup: id("products-group"), projectDirPath: "", projectRoot: "", targets: [app, unit, ui] });

function serialize(value, depth = 0) {
  const indent = "\t".repeat(depth);
  if (value === objects) {
    const sections = new Map();
    for (const [key, item] of Object.entries(objects)) sections.set(item.isa, [...(sections.get(item.isa) ?? []), [key, item]]);
    return `{\n${Array.from(sections, ([type, entries]) => `\n/* Begin ${type} section */\n${entries.map(([key, item]) => `${indent}\t${key} = ${serialize(item, depth + 1)};`).join("\n")}\n/* End ${type} section */`).join("\n")}\n${indent}}`;
  }
  if (Array.isArray(value)) return `(\n${value.map((item) => `${indent}\t${serialize(item, depth + 1)},`).join("\n")}\n${indent})`;
  if (value && typeof value === "object") return `{\n${Object.entries(value).map(([key, item]) => `${indent}\t${serialize(key)} = ${serialize(item, depth + 1)};`).join("\n")}\n${indent}}`;
  return typeof value === "number" || /^[A-Za-z0-9_./]+$/.test(value) ? String(value) : JSON.stringify(value);
}
const project = join(root, "AMenu.xcodeproj");
mkdirSync(join(project, "xcshareddata", "xcschemes"), { recursive: true });
writeFileSync(join(project, "project.pbxproj"), `// !$*UTF8*$!\n${serialize({ archiveVersion: 1, classes: {}, objectVersion: 55, objects, rootObject: id("project") })}\n`);
const buildable = (identifier, name, file) => `<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${identifier}" BuildableName="${file}" BlueprintName="${name}" ReferencedContainer="container:AMenu.xcodeproj"/>`;
writeFileSync(join(project, "xcshareddata", "xcschemes", "AMenu.xcscheme"), `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1320" version="1.7">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">${buildable(app, "AMenu", "AMenu.app")}</BuildActionEntry></BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">${buildable(unit, "AMenuTests", "AMenuTests.xctest")}</TestableReference><TestableReference skipped="NO">${buildable(ui, "AMenuUITests", "AMenuUITests.xctest")}</TestableReference></Testables></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">${buildable(app, "AMenu", "AMenu.app")}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">${buildable(app, "AMenu", "AMenu.app")}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
`);
console.log(`Generated native Xcode project with ${appFiles.length} Swift app files.`);
