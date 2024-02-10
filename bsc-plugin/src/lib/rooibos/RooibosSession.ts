import * as path from 'path';
import type { BrsFile, ClassStatement, FunctionStatement, NamespaceContainer, NamespaceStatement, Program, ProgramBuilder, Scope } from 'brighterscript';
import { isBrsFile, isCallExpression, isVariableExpression, ParseMode, Parser, WalkMode } from 'brighterscript';
import type { AstEditor } from 'brighterscript/dist/astUtils/AstEditor';
import type { RooibosConfig } from './RooibosConfig';
import { SessionInfo } from './RooibosSessionInfo';
import { TestSuiteBuilder } from './TestSuiteBuilder';
import type { FileFactory } from './FileFactory';
import type { TestSuite } from './TestSuite';
import { diagnosticErrorNoMainFound as diagnosticWarnNoMainFound, diagnosticNoStagingDir } from '../utils/Diagnostics';
import undent from 'undent';
import * as fsExtra from 'fs-extra';
import type { MockUtil } from './MockUtil';

// eslint-disable-next-line
const pkg = require('../../../package.json');

export class RooibosSession {

    constructor(builder: ProgramBuilder, fileFactory: FileFactory) {
        this.fileFactory = fileFactory;
        this.config = builder.options ? (builder.options as any).rooibos as RooibosConfig || {} : {};
        this._builder = builder;
        this._suiteBuilder = new TestSuiteBuilder(this);
        this.reset();
    }

    private fileFactory: FileFactory;
    private _builder: ProgramBuilder;
    config: RooibosConfig;
    namespaceLookup: Map<string, NamespaceContainer>;
    private _suiteBuilder: TestSuiteBuilder;

    sessionInfo: SessionInfo;
    globalStubbedMethods = new Set<string>();

    reset() {
        this.sessionInfo = new SessionInfo(this.config);
    }

    prepareForTranspile(editor: AstEditor, program: Program, mockUtil: MockUtil) {
        this.addTestRunnerMetadata(editor);
        this.addLaunchHookToExistingMain(editor);

        // Make sure to create the node files before running the global mock logic
        // We realy on them in order to check the component scope for the global functions
        for (let testSuite of this.sessionInfo.testSuitesToRun) {
            if (testSuite.isNodeTest) {
                this.createNodeFile(program, testSuite);
            }
        }

        if (this.config.isGlobalMethodMockingEnabled && this.config.isGlobalMethodMockingEfficientMode) {
            console.log('Efficient global stubbing is enabled');
            this.namespaceLookup = this.getNamespaces(program);
            for (let testSuite of this.sessionInfo.testSuitesToRun) {
                mockUtil.gatherGlobalMethodMocks(testSuite);
            }

        } else {
            this.namespaceLookup = new Map<string, NamespaceContainer>();
        }
    }

    updateSessionStats() {
        this.sessionInfo.updateInfo();
    }

    processFile(file: BrsFile): TestSuite[] {
        let testSuites = this._suiteBuilder.processFile(file);
        return testSuites;
    }

    addLaunchHookToExistingMain(editor: AstEditor) {
        let mainFunction: FunctionStatement;
        const files = this._builder.program.getScopeByName('source').getOwnFiles();
        for (let file of files) {
            if (isBrsFile(file)) {
                const mainFunc = file.parser.references.functionStatements.find((f) => f.name.text.toLowerCase() === 'main');
                if (mainFunc) {
                    mainFunction = mainFunc;
                    break;
                }
            }
        }
        if (mainFunction) {
            const initCall = mainFunction.func.body.findChild(f => isCallExpression(f) && isVariableExpression(f.callee) && f.callee.name.text.toLowerCase() === 'rooibos_init', {
                walkMode: WalkMode.visitAllRecursive
            });
            if (!initCall) {
                editor.addToArray(mainFunction.func.body.statements, 0, Parser.parse(`Rooibos_init("${this.config?.testSceneName ?? 'RooibosScene'}")`).ast.statements[0]);
            }
        }
    }
    addLaunchHookFileIfNotPresent() {
        let mainFunction: FunctionStatement;
        const files = this._builder.program.getScopeByName('source').getOwnFiles();
        for (let file of files) {
            if (isBrsFile(file)) {
                const mainFunc = file.parser.references.functionStatements.find((f) => f.name.text.toLowerCase() === 'main');
                if (mainFunc) {
                    mainFunction = mainFunc;
                    break;
                }
            }
        }
        if (!mainFunction) {
            diagnosticWarnNoMainFound(files[0]);
            if (!this._builder.options.stagingDir && !this._builder.options.stagingFolderPath) {
                console.error('this plugin requires that stagingDir or the deprecated stagingFolderPath bsconfig option is set');
                diagnosticNoStagingDir(files[0]);
            } else {
                const filePath = path.join(this._builder.options.stagingDir ?? this._builder.options.stagingFolderPath, 'source/rooibosMain.brs');
                fsExtra.writeFileSync(filePath, `function main()\n    Rooibos_init("${this.config?.testSceneName ?? 'RooibosScene'}")\nend function`);

            }
        }
    }

    addTestRunnerMetadata(editor: AstEditor) {
        let runtimeConfig = this._builder.program.getFile<BrsFile>('source/rooibos/RuntimeConfig.bs');
        if (runtimeConfig) {
            let classStatement = (runtimeConfig.ast.statements[0] as NamespaceStatement).body.statements[0] as ClassStatement;
            this.updateRunTimeConfigFunction(classStatement, editor);
            this.updateVersionTextFunction(classStatement, editor);
            this.updateClassLookupFunction(classStatement, editor);
            this.updateGetAllTestSuitesNames(classStatement, editor);
            this.createIgnoredTestsInfoFunction(classStatement, editor);
        }
    }

    updateRunTimeConfigFunction(classStatement: ClassStatement, editor: AstEditor) {
        let method = classStatement.methods.find((m) => m.name.text === 'getRuntimeConfig');
        if (method) {
            editor.addToArray(
                method.func.body.statements,
                method.func.body.statements.length,
                Parser.parse(undent`
                    return {
                        "reporters": ${this.getReportersList()}
                        "failFast": ${this.config.failFast ? 'true' : 'false'}
                        "sendHomeOnFinish": ${this.config.sendHomeOnFinish ? 'true' : 'false'}
                        "logLevel": ${this.config.logLevel ?? 0}
                        "showOnlyFailures": ${this.config.showOnlyFailures ? 'true' : 'false'}
                        "printTestTimes": ${this.config.printTestTimes ? 'true' : 'false'}
                        "lineWidth": ${this.config.lineWidth || 60}
                        "printLcov": ${this.config.printLcov ? 'true' : 'false'}
                        "port": "${this.config.port || 'invalid'}"
                        "catchCrashes": ${this.config.catchCrashes ? 'true' : 'false'}
                        "throwOnFailedAssertion": ${this.config.throwOnFailedAssertion ? 'true' : 'false'}
                        "keepAppOpen": ${this.config.keepAppOpen === undefined || this.config.keepAppOpen ? 'true' : 'false'}
                        "isRecordingCodeCoverage": ${this.config.isRecordingCodeCoverage ? 'true' : 'false'}
                    }
                `).ast.statements[0]
            );
        }
    }

    getReportersList() {
        let reporters = this.config.reporters;
        if (!Array.isArray(reporters)) {
            reporters = [];
        }
        if (this.config.reporter) {
            // @todo: warn that `reporter` is deprecated and to use `reporters` instead
            reporters.push(this.config.reporter);
        }
        if (reporters.length < 1) {
            reporters.push('console');
        }
        return `[${reporters.map(this.sanitiseReporterName).toString()}]`;
    }

    sanitiseReporterName(name: string) {
        switch (name.toLowerCase()) {
            case 'console': return 'rooibos_ConsoleTestReporter';
            case 'junit': return 'rooibos_JUnitTestReporter';
        }
        // @todo: check if function name is valid
        return name;
    }

    updateVersionTextFunction(classStatement: ClassStatement, editor: AstEditor) {
        let method = classStatement.methods.find((m) => m.name.text === 'getVersionText');
        if (method) {
            editor.addToArray(
                method.func.body.statements,
                method.func.body.statements.length,
                Parser.parse(`return "${pkg.version}"`).ast.statements[0]
            );
        }
    }

    updateClassLookupFunction(classStatement: ClassStatement, editor: AstEditor) {
        let method = classStatement.methods.find((m) => m.name.text === 'getTestSuiteClassWithName');
        if (method) {
            editor.arrayPush(method.func.body.statements, ...Parser.parse(undent`
                if false
                    ? "noop" ${this.sessionInfo.testSuitesToRun.map(suite => `
                else if name = "${suite.name}"
                    return ${suite.classStatement.getName(ParseMode.BrightScript)}`).join('')}
                end if
            `).ast.statements);
        }
    }

    updateGetAllTestSuitesNames(classStatement: ClassStatement, editor: AstEditor) {
        let method = classStatement.methods.find((m) => m.name.text === 'getAllTestSuitesNames');
        if (method) {
            editor.arrayPush(method.func.body.statements, ...Parser.parse([
                'return [',
                ...this.sessionInfo.testSuitesToRun.map((s) => `    "${s.name}"`),
                ']'
            ].join('\n')).ast.statements);
        }
    }

    createNodeFiles(program: Program) {

        for (let suite of this.sessionInfo.testSuitesToRun.filter((s) => s.isNodeTest)) {
            this.createNodeFile(program, suite);
        }
    }

    createNodeFile(program: Program, suite: TestSuite) {
        let p = path.join('components', 'rooibos', 'generated');

        let xmlText = this.getNodeTestXmlText(suite);
        let bsPath = path.join(p, `${suite.generatedNodeName}.bs`);
        this.fileFactory.addFile(program, path.join(p, `${suite.generatedNodeName}.xml`), xmlText);
        let bsFile = program.getFile(bsPath);
        if (bsFile) {
            (bsFile as BrsFile).parser.statements.push();
            bsFile.needsTranspiled = true;
        }
        let brsFile = this.fileFactory.addFile(program, bsPath, undent`
            import "pkg:/${suite.file.pkgPath}"
            function init()
                nodeRunner = Rooibos_TestRunner(m.top.getScene(), m)
                m.top.rooibosTestResult = nodeRunner.runInNodeMode("${suite.name}")
            end function
        `);
        brsFile.parser.invalidateReferences();
    }

    private getNodeTestXmlText(suite: TestSuite) {
        return this.fileFactory.createTestXML(suite.generatedNodeName, suite.nodeName);
    }

    private getNamespaceLookup(scope: Scope): Map<string, NamespaceContainer> {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        return scope['cache'].getOrAdd('namespaceLookup', () => scope.buildNamespaceLookup() as any);
    }

    private getNamespaces(program: Program) {
        let scopeNamespaces = new Map<string, NamespaceContainer>();
        let processedScopes = new Set<string>();

        for (const file of Object.values(program.files)) {

            for (let scope of program.getScopesForFile(file)) {
                if (processedScopes.has(scope.dependencyGraphKey)) {
                    // Skip this scope if it has already been processed
                    continue;
                }
                let scopeMap = this.getNamespaceLookup(scope);
                // scopeNamespaces = new Map<string, NamespaceContainer>([...Array.from(scopeMap.entries())]);
                for (let [key, value] of scopeMap.entries()) {
                    scopeNamespaces.set(key, value);
                }
                processedScopes.add(scope.dependencyGraphKey);
            }
        }
        return scopeNamespaces;
    }


    private createIgnoredTestsInfoFunction(cs: ClassStatement, editor: AstEditor) {
        let method = cs.methods.find((m) => m.name.text === 'getIgnoredTestInfo');
        if (method) {
            editor.arrayPush(method.func.body.statements, ...Parser.parse([
                'return {',
                `    "count": ${this.sessionInfo.ignoredCount}`,
                `    "items": [`,
                ...this.sessionInfo.ignoredTestNames.map((name) => `"${name}"`),
                `    ]`,
                `}`
            ].join('\n')).ast.statements);
        }
    }
}
