// import * as fs from "fs-extra";
import * as spawn from "cross-spawn";

import { Command } from "../command";
import { FirebaseError } from "../error";
import * as utils from "../utils";
// import * as downloadUtils from "../downloadUtils";

enum SymbolGenerator {
  breakpad = "breakpad",
  csym = "csym",
}

interface Options {
  app: string;
  symbolGenerator: SymbolGenerator;
  debug: boolean;
}

interface JarOptions {
  jarFile: string;
  app: string;
  symbolGenerator: SymbolGenerator;
  symbolFile: string;
  generate: boolean;
}

const SYMBOL_CACHE_DIR = "symbolCache";

export default new Command("crashlytics:symbols:upload <symbol-files...>")
  .description("Upload symbols for native code, to symbolicate stack traces.")
  .option("--app <app_id>", "the app id of your Firebase app")
  .option(
    "--symbol-generator [breakpad|csym]",
    "the symbol generator being used, defaults to breakpad."
  )
  .option("--debug", "print debug output and logging from the underlying uploader tool")
  .action((symbolFiles: string[], options: Options) => {
    const app = getGoogleAppID(options) || "";
    const symbolGenerator = getSymbolGenerator(options);
    const debug = !!options.debug;
    for (const symbolFile of symbolFiles) {
      const jarFile = downloadBuiltoolsJar();
      const jarOptions: JarOptions = {
        jarFile,
        app,
        symbolGenerator,
        symbolFile,
        generate: true,
      };

      utils.logBullet(`Generating symbols for ${symbolFile}`);

      const generateArgs = buildArgs(jarOptions);
      runJar(generateArgs, debug);

      utils.logBullet(`Uploading symbols for ${symbolFile}`);

      const uploadArgs = buildArgs({ ...jarOptions, generate: false });
      runJar(uploadArgs, debug);

      utils.logSuccess(`Successfully uploaded symbols for ${symbolFile}`);
    }
  });

function getGoogleAppID(options: Options): string | null {
  if (!options.app) {
    throw new FirebaseError("set the --app option to a valid Firebase app id and try again");
  }
  return options.app;
}

function getSymbolGenerator(options: Options): SymbolGenerator {
  // Default to using BreakPad symbols
  if (!options.symbolGenerator) {
    return SymbolGenerator.breakpad;
  }
  if (!Object.values(SymbolGenerator).includes(options.symbolGenerator)) {
    throw new FirebaseError('--symbol-generator should be set to either "breakpad" or "csym"');
  }
  return options.symbolGenerator;
}

function downloadBuiltoolsJar(): Promise<string> {
  // const buildtoolsUrl= "https://dl.google.com/android/maven2/com/google/firebase/firebase-crashlytics-buildtools/2.7.1/firebase-crashlytics-buildtools-2.7.1.jar";
  // const localCacheDir = ".crashlytics"
  // const BUILDTOOLS_JAR="../testRepo/crashlytics-buildtools/repository/com/google/firebase/firebase-crashlytics-buildtools/2.6.1/firebase-crashlytics-buildtools-2.6.1.jar"
  // const tmpfile = await downloadUtils.downloadToTmp(buildtoolsUrl);
  // const dest = localCacheDir + "/buildtools.jar";
  // fs.copySync(tmpfile, dest);
  // logger.info("Downloaded buildtools.jar to " + dest);
  // return dest;
  return "/Users/samedson/Desktop/CLI/crashlytics-buildtools-all-2.7.2.jar";
}

function buildArgs(options: JarOptions): string[] {
  const baseArgs = [
    "-jar",
    options.jarFile,
    `-symbolGenerator=${options.symbolGenerator}`,
    `-symbolFileCacheDir=${SYMBOL_CACHE_DIR}`,
    "-verbose",
  ];

  if (options.generate) {
    return baseArgs.concat(["-generateNativeSymbols", `-unstrippedLibrary=${options.symbolFile}`]);
  }

  return baseArgs.concat([
    "-uploadNativeSymbols",
    `-googleAppId=${options.app}`,
    // `-androidApplicationId=`,
  ]);
}

function runJar(args: string[], debug: boolean): void {
  // Inherit is better for debug output because it'll print as it goes. If we
  // pipe here and print after it'll wait until the command has finished to
  // print all the output.
  const outputs = spawn.sync("java", args, {
    stdio: debug ? "inherit" : "pipe",
  });

  if (outputs.status || 0 > 0) {
    if (!debug) {
      utils.logWarning(outputs.stdout?.toString() || "An unknown error occurred");
    }
    throw new FirebaseError("Failed to upload symbols");
  }
}
