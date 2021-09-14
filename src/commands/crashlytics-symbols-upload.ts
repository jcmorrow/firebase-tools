import * as childProcess from "child_process";
import { args } from "commander";
import { generateKeyPairSync } from "crypto";
import * as fs from "fs-extra";

import { Command } from "../command";

import * as downloadUtils from "../downloadUtils"

const { logger } = require("../logger");

const buildtoolsUrl= "https://dl.google.com/android/maven2/com/google/firebase/firebase-crashlytics-buildtools/2.7.1/firebase-crashlytics-buildtools-2.7.1.jar"; 
const localCacheDir = ".crashlytics"

async function downloadBuiltoolsJar() {
  //const tmpfile = await downloadUtils.downloadToTmp(buildtoolsUrl);

  const dest = localCacheDir + "/buildtools.jar";
  //fs.copySync(tmpfile, dest);
  logger.info("Downloaded buildtools.jar to " + dest);

  return dest;
}



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

export default new Command("crashlytics:symbols:upload")
  .description("Upload symbols for native code, to symbolicate stack traces.")
  // .option("-e, --example <requiredValue>", "describe the option briefly")
  // .before(requireConfig) // add any necessary filters and require them above
  // .help(text) // additional help to be visible with --help or the help command
  .action(async (options) => {
    // options will be available at e.g. options.example
    // this should return a Promise that resolves to a reasonable result
    logger.info("Executing crashlytics:symbols:upload!!");

  const SYMBOL_CACHE_DIR = "symbolCache"
  const GOOGLE_APP_ID="1:673854374253:android:9977016aa995032e"
  const ANDROID_APP_ID="com.example.firebase.crashlytics.crashapp_ndk"
  //const BUILDTOOLS_JAR="../testRepo/crashlytics-buildtools/repository/com/google/firebase/firebase-crashlytics-buildtools/2.6.1/firebase-crashlytics-buildtools-2.6.1.jar" 
  const UNSTRIPPED_LIBRARY="temp/libnative-lib.so"

  const jarFile = await downloadBuiltoolsJar()
  const baseArgs = [
    "-jar", 
    jarFile, 
    "-verbose", 
    "-symbolGenerator=breakpad", 
    "-symbolFileCacheDir="+SYMBOL_CACHE_DIR];

    const generateArgs = baseArgs.concat([
      "-generateNativeSymbols",
      "-unstrippedLibrary=" + UNSTRIPPED_LIBRARY
    ]);

    logger.info("GENERATING....!!");
    //const generatePs = childProcess.spawn("java", ["-jar", jarFile], { stdio: 'inherit' });
    const generatePs = childProcess.spawn("java", generateArgs, { stdio: 'inherit' });
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

    logger.info("DONE!");
    
  });