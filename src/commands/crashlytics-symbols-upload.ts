import * as childProcess from "child_process";
import { args, option } from "commander";
import { generateKeyPairSync } from "crypto";
import * as fs from "fs-extra";

import { Command } from "../command";
import { FirebaseError } from "../error";
import * as utils from "../utils";

import * as downloadUtils from "../downloadUtils"
import { jar } from "request";

enum SymbolGenerator {
  breakpad = "breakpad",
  csym = "csym",
};

const buildtoolsUrl= "https://dl.google.com/android/maven2/com/google/firebase/firebase-crashlytics-buildtools/2.7.1/firebase-crashlytics-buildtools-2.7.1.jar";
const localCacheDir = ".crashlytics"

const SYMBOL_CACHE_DIR = "symbolCache"
//const BUILDTOOLS_JAR="../testRepo/crashlytics-buildtools/repository/com/google/firebase/firebase-crashlytics-buildtools/2.6.1/firebase-crashlytics-buildtools-2.6.1.jar"
const UNSTRIPPED_LIBRARY="temp/libnative-lib.so"

  /*()
# `-symbolGenerator=breakpad` option for both the generate and upload
# commands. To use the legacy generator, omit this option.

## Generate the symbol file in SYMBOL_CACHE_DIR
echo java -jar $BUILDTOOLS_JAR -generateNativeSymbols \
  -unstrippedLibrary=$UNSTRIPPED_LIBRARY -symbolFileCacheDir=$SYMBOL_CACHE_DIR -symbolGenerator=breakpad -verbose

## Upload all .cSYM files in SYMBOL_CACHE_DIR to Crashlytics servers and associate with the specified app.
echo java -jar $BUILDTOOLS_JAR -uploadNativeSymbols \
  -androidApplicationId=$ANDROID_APP_ID -googleAppId=$GOOGLE_APP_ID -symbolFileCacheDir=$SYMBOL_CACHE_DIR -symbolGenerator=breakpad -verbose
}
*/

export default new Command("crashlytics:symbols:upload <symbol-files...>")
  .description("Upload symbols for native code, to symbolicate stack traces.")
  .option("--app <app_id>", "the app id of your Firebase app")
  .option("--symbol-generator [breakpad|csym]", "the symbol generator being used, defaults to breakpad.")
  .action(async (symbolFiles: string[], options) => {
    let appID = getGoogleAppID(options);
    let symbolGenerator = getSymbolGenerator(options);

    utils.logWarning(symbolFiles.toString());

    const jarFile = await downloadBuiltoolsJar()
    const args = buildArgs(jarFile, symbolGenerator);

    utils.logBullet("Generating symbols");
    //const generatePs = childProcess.spawn("java", ["-jar", jarFile], { stdio: 'inherit' });
    const generatePs = childProcess.spawn("java", args, { stdio: 'inherit' });
    generatePs.stdout.on('data', data => {
      console.log(`stdout:\n${data}`);
    });

    generatePs.stderr.on('data', data => {
      console.error(`stderr: ${data}`);
    });

    generatePs.on('error', (error) => {
      console.error(`error: ${error.message}`);
    });

    generatePs.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });

    utils.logBullet("Successfully uploaded symbols");

  });

function getGoogleAppID(options: any): string|null {
  if (!options.app) {
    throw new FirebaseError("set the --app option to a valid Firebase app id and try again");
  }
  return options.app;
}

function getSymbolGenerator(options: any): SymbolGenerator {
  // Default to using BreakPad symbols
  if (!options.symbolGenerator) {
    return SymbolGenerator.breakpad;
  }
  if (!Object.values(SymbolGenerator).includes(options.symbolGenerator)) {
    throw new FirebaseError("--symbol-generator should be set to either \"breakpad\" or \"csym\"");
  }
  return options.symbolGenerator
}

async function downloadBuiltoolsJar() {
  //const tmpfile = await downloadUtils.downloadToTmp(buildtoolsUrl);

  // const dest = localCacheDir + "/buildtools.jar";
  //fs.copySync(tmpfile, dest);
  // logger.info("Downloaded buildtools.jar to " + dest);

  // return dest;
  return "/Users/samedson/Desktop/CLI/crashlytics-buildtools-all-2.7.2.jar";
}

function buildArgs(jarFile, symbolGenerator) {
  const baseArgs = [
    "-jar",
    jarFile,
    "-verbose",
    `-symbolGenerator=${symbolGenerator}`,
    `-symbolFileCacheDir=${SYMBOL_CACHE_DIR}`];

  const generateArgs = baseArgs.concat([
    "-generateNativeSymbols",
    "-unstrippedLibrary=" + UNSTRIPPED_LIBRARY
  ]);
  return generateArgs;
}
