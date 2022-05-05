import { ChildProcess, fork } from 'child_process';
import { existsSync } from 'fs';
import { join, normalize, parse } from 'path';
import { Compiler, Stats } from 'webpack';

export interface WebpackNodeRuntimePluginOptions {
    scriptToRun?: string;
    nodeArgs?: string[];
}

const PLUGIN_NAME = "NodeRuntimePlugin"

export class NodeRuntimePlugin {
    options: WebpackNodeRuntimePluginOptions;
    isWebpackInWatchMode: boolean = false;
    scriptName?: string;
    scriptPath?: string;
    scriptProcess?: ChildProcess;

    constructor(options?: WebpackNodeRuntimePluginOptions) {
        const defaultOptions: WebpackNodeRuntimePluginOptions = {
            scriptToRun: undefined,
            nodeArgs: [],
        };
        this.options = { ...defaultOptions, ...options };
    }

    apply(compiler: Compiler) {
        const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);
        compiler.hooks.watchRun.tap(PLUGIN_NAME, () => (this.isWebpackInWatchMode = true));


        compiler.hooks.done.tap(PLUGIN_NAME, (stats: Stats) => {
            // dont run if webpack is not in a watch mode and runOnlyInWatchMode option is truthy
            if (!this.isWebpackInWatchMode) {
                logger.warn(`${PLUGIN_NAME}: Skipped due watch mode not enabled. To enable use --watch flag.`);
                return;
            }

            // dont run if webpack compilation contains errors and ignoreErrors option is falsy
            if (stats.hasErrors()) {
                logger.warn(`${PLUGIN_NAME}: Skipped due build has errors.`);
                return;
            }

            const { compilation } = stats;
            const { compiler, assets: outputAssets } = compilation;
            const outputAssetNames: string[] = Object.keys(outputAssets);
            const outputPath = compilation.getPath(compiler.outputPath);

            // check if output assets dont exist. idk if this can really happen
            if (outputAssetNames.length < 1) {
                logger.error(`${PLUGIN_NAME}: No output assets to process!`);
                return;
            }


            if (this.options.scriptToRun && this.options.scriptToRun.length > 0) {
                const matchedName: string | undefined = findMatchingScriptName(this.options.scriptToRun, outputAssetNames);
                if (matchedName) {
                    this.scriptName = matchedName;
                    this.scriptPath = join(outputPath, this.scriptName);

                } else if (existsSync(this.options.scriptToRun)) {
                    this.scriptName = parse(this.options.scriptToRun).base;
                    this.scriptPath = normalize(this.options.scriptToRun);
                }
                else {
                    logger.error(`${PLUGIN_NAME}:  Script to run couldn't found on both emitted assets or path directory. Please check script name or path for ${this.options.scriptToRun}.`);
                    return;
                }
            } else if (outputAssetNames.length === 1) {
                // if theres only 1 file in output assets choose it
                this.scriptName = outputAssetNames[0];
                this.scriptPath = join(outputPath, this.scriptName);
            } else {
                logger.error(`${PLUGIN_NAME}:  Multiple output assets detected. Please specify output assets to run with options.scriptToRun from output assets: ${outputAssetNames}`);
                return;
            }

            if (!this.scriptPath) {
                logger.error(`${PLUGIN_NAME}: Detected undefined script path for ${this.options.scriptToRun}`);
                return;
            }

            if (!this.scriptName) {
                logger.error(`${PLUGIN_NAME}:  Detected undefined script name for ${this.options.scriptToRun}`);
                return;
            }

            if (this.scriptProcess && this.scriptProcess.connected) {
                logger.info(`${PLUGIN_NAME}:  Script process restarting ...`);

                this.scriptProcess.on('exit', () => {
                    this.scriptProcess = fork(this.scriptPath!, this.options.nodeArgs);
                });
                try {
                    this.scriptProcess.kill('SIGTERM');
                } catch (error) {
                    logger.error(`${PLUGIN_NAME}: ${error}`);
                }
            } else {
                logger.info(`${PLUGIN_NAME}: Script process starting ...`);
                try {
                    this.scriptProcess = fork(this.scriptPath, this.options.nodeArgs);
                } catch (error) {
                    logger.error(`${PLUGIN_NAME}: ${error}`);
                }
            }
        });
    }
}

function findMatchingScriptName(scriptNameToFind: string, scriptNames: string[]) {
    for (const name of scriptNames) {
        if (name === scriptNameToFind) {
            return name;
        }
    }
    for (const name of scriptNames) {
        if (name.indexOf(scriptNameToFind) !== -1) {
            return name;
        }
    }

    return undefined;
}

module.exports = NodeRuntimePlugin;