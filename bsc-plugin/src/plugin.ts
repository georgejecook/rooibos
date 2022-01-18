import type {
    AfterFileParseEvent,
    AfterProgramCreateEvent,
    BeforeProgramCreateEvent,
    BeforeProgramValidateEvent,
    BeforePublishEvent,
    BrsFile,
    BscFile,
    Program,
    ProgramBuilder,
    XmlFile
} from 'brighterscript';

import { isBrsFile } from 'brighterscript/dist/astUtils';

import { RooibosSession } from './lib/rooibos/RooibosSession';

import { CodeCoverageProcessor } from './lib/rooibos/CodeCoverageProcessor';
import { FileFactory } from './lib/rooibos/FileFactory';
import type { RooibosConfig } from './lib/rooibos/RooibosConfig';

import * as minimatch from 'minimatch';

export class RooibosPlugin {

    name: 'rooibosPlugin';
    public session: RooibosSession;
    public codeCoverageProcessor: CodeCoverageProcessor;
    public fileFactory: FileFactory;
    public isFrameworkAdded = false;
    public _builder: ProgramBuilder;
    public config: RooibosConfig;

    beforeProgramCreate(event: BeforeProgramCreateEvent): void {
        this._builder = event.builder;

        this.config = this.getConfig((event.builder.options as any).rooibos || {});

        this.fileFactory = new FileFactory(this.config);
        if (!this.session) {
            this.session = new RooibosSession(event.builder, this.fileFactory);
            this.codeCoverageProcessor = new CodeCoverageProcessor(event.builder);
        }
    }
    private getConfig(options: any) {
        let config: RooibosConfig = options;
        if (config.printTestTimes === undefined) {
            config.printTestTimes = true;
        }
        if (config.catchCrashes === undefined) {
            config.catchCrashes = true;
        }
        if (config.sendHomeOnFinish === undefined) {
            config.sendHomeOnFinish = true;
        }
        if (config.failFast === undefined) {
            config.failFast = true;
        }
        if (config.showOnlyFailures === undefined) {
            config.showOnlyFailures = true;
        }
        if (config.isRecordingCodeCoverage === undefined) {
            config.isRecordingCodeCoverage = true;
        }
        //ignore roku modules by default
        if (config.includeFilters === undefined) {
            config.includeFilters = [
                '**/*.spec.bs',
                '!**/BaseTestSuite.spec.bs',
                '!**/roku_modules/**/*'];
        }

        return config;
    }

    afterProgramCreate(event: AfterProgramCreateEvent) {
        if (!this.isFrameworkAdded) {
            this.fileFactory.addFrameworkFiles(event.program);
        }
    }

    afterFileParse(event: AfterFileParseEvent): void {
        // console.log('afp', file.pkgPath);
        const file = event.file;
        if (this.fileFactory.isIgnoredFile(file) || !this.shouldSearchInFileForTests(file)) {
            return;
        }

        // console.log('processing ', file.pkgPath);
        if (isBrsFile(file)) {
            if (this.session.processFile(file)) {
                //
            } else {
                this.codeCoverageProcessor.addCodeCoverage(file);
            }
        }
    }

    beforePublish(event: BeforePublishEvent) {
        // console.log('bp');
        for (let testSuite of [...this.session.sessionInfo.testSuitesToRun.values()]) {
            let noEarlyExit = testSuite.annotation.noEarlyExit;
            if (noEarlyExit) {
                console.warn(`WARNING: testSuite "${testSuite.name}" is marked as noEarlyExit`);
            }

            testSuite.addDataFunctions();
            for (let group of [...testSuite.testGroups.values()].filter((tg) => tg.isIncluded)) {
                for (let testCase of [...group.testCases.values()].filter((tc) => tc.isIncluded)) {
                    group.modifyAssertions(testCase, noEarlyExit);
                }
            }
        }

        for (let testSuite of [...this.session.sessionInfo.allTestSuites.values()].filter((ts) => !ts.isIncluded)) {
            testSuite.removeCode();
        }

        this.session.addTestRunnerMetadata();
        this.session.addLaunchHook();
        this.session.createNodeFiles(this._builder.program);
    }

    beforeProgramValidate(event: BeforeProgramValidateEvent) {
        // console.log('bpv');
        this.session.updateSessionStats();
        for (let testSuite of [...this.session.sessionInfo.testSuites.values()]) {
            testSuite.validate();
        }
    }

    shouldSearchInFileForTests(file: BscFile) {
        if (!this.config.includeFilters || this.config.includeFilters.length === 0) {
            return true;
        } else {
            for (let filter of this.config.includeFilters) {
                if (!minimatch(file.srcPath, filter)) {
                    return false;
                }
            }
        }
        // console.log('including ', file.pkgPath);
        return true;
    }
}

export default () => {
    return new RooibosPlugin();
};
