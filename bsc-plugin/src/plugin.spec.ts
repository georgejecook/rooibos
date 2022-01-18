/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import type { BsConfig } from 'brighterscript';
import { DiagnosticSeverity, Program, ProgramBuilder, util } from 'brighterscript';
import { expect } from 'chai';
import { standardizePath as s } from './lib/rooibos/Utils';
import { RooibosPlugin } from './plugin';
import PluginInterface from 'brighterscript/dist/PluginInterface';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
let tmpPath = s`${process.cwd()}/tmp`;
let _rootDir = s`${tmpPath}/rootDir`;
let _stagingFolderPath = s`${tmpPath}/staging`;

import { trimLeading } from './lib/utils/testHelpers.spec';

describe('RooibosPlugin', () => {
    let program: Program;
    let builder: ProgramBuilder;
    let plugin: RooibosPlugin;
    let options;
    beforeEach(() => {
        plugin = new RooibosPlugin();
        options = {
            rootDir: _rootDir,
            stagingFolderPath: _stagingFolderPath
        };
        fsExtra.ensureDirSync(_stagingFolderPath);
        fsExtra.ensureDirSync(_rootDir);
        fsExtra.ensureDirSync(tmpPath);

        builder = new ProgramBuilder();
        builder.options = util.normalizeAndResolveConfig(options as BsConfig);
        builder.program = new Program(builder.options);
        program = builder.program;
        builder.plugins = new PluginInterface([plugin], builder.logger);
        program.plugins = new PluginInterface([plugin], builder.logger);
        program.createSourceScope(); //ensure source scope is created
        plugin.beforeProgramCreate({ builder: builder });
        plugin.fileFactory.sourcePath = path.resolve(path.join('../framework/src/source'));


    });
    afterEach(() => {
        fsExtra.ensureDirSync(tmpPath);
        fsExtra.emptyDirSync(tmpPath);
        builder.dispose();
        program.dispose();
    });

    describe('basic tests', () => {

        it('does not find tests with no annotations', () => {
            program.setFile('source/test.spec.bs', `
                class notATest
                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.be.empty;
        });
        it('finds a basic suite', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")

                    @it("is test1")
                    function Test()
                    end function

                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
        });
        it('finds a suite name, only', () => {
            program.setFile('source/test.spec.bs', `
                @only
                @suite("named")
                class ATest
                    @describe("groupA")

                    @it("is test1")
                    function Test()
                    end function

                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            let suite = plugin.session.sessionInfo.testSuitesToRun[0];
            expect(suite.name).to.equal('named');
            expect(suite.isSolo).to.be.true;
        });
        it('ignores a suite', () => {
            program.setFile('source/test.spec.bs', `
                @ignore
                @suite
                class ATest
                    @describe("groupA")

                    @it("is test1")
                    function Test()
                    end function

                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.be.empty;
        });
        it('ignores a group', () => {
            program.setFile('source/test.spec.bs', `
            @suite
                    class ATest
                    @ignore
                    @describe("groupA")

                    @it("is test1")
                    function Test()
                    end function

                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.groupsCount).to.equal(0);
            expect(plugin.session.sessionInfo.testsCount).to.equal(0);
        });
        it('ignores a test', () => {
            program.setFile('source/test.spec.bs', `
            @suite
            class ATest
            @describe("groupA")

            @ignore
            @it("is test1")
                    function Test()
                    end function

                    end class
                    `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.groupsCount).to.equal(1);
            expect(plugin.session.sessionInfo.testsCount).to.equal(0);
        });
        it('multiple groups', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                @describe("groupA")

                @it("is test1")
                function Test_1()
                end function

                @describe("groupB")

                @it("is test1")
                function Test_2()
                end function

                @it("is test2")
                function Test_3()
                end function

                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            let suite = plugin.session.sessionInfo.testSuitesToRun[0];
            expect(suite.getTestGroups()[0].testCases).to.have.length(1);
        });
        it('duplicate test name', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")

                    @it("is test1")
                    function Test_1()
                    end function

                    @describe("groupB")

                    @it("is test1")
                    function Test_2()
                    end function

                    @it("is test1")
                    function Test_3()
                    end function

                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.be.empty;
        });
        it('empty test group', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")
                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.be.empty;
        });
        it('multiple test group annotations - same name', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")
                    @describe("groupA")
                    @it("is test1")
                    function Test_3()
                    end function
                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.be.empty;
        });
        it('params test with negative numbers', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")
                    @it("is test1")
                    @params(100,100)
                    @params(100,-100)
                    @params(-100,100)
                    @params(-100,-100)
                    function Test_3(a, b)
                    end function
                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
        });
        it('updates test name to match name of annotation', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")
                    @it("is test1")
                    function test()
                    end function
                    @it("is test2")
                    function test()
                    end function
                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
        });
        it('updates test name to match name of annotation - with params', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")
                    @it("is test1")
                    function test()
                    end function
                    @it("is test2")
                    @params(1)
                    @params(2)
                    function test(arg)
                    end function
                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
        });
        it('multiple test group annotations - different name', () => {
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest
                    @describe("groupA")
                    @describe("groupB")
                    @it("is test1")
                    function Test_3()
                    end function
                end class
            `);
            program.validate();
            expect(program.getDiagnostics()).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun).to.be.empty;
        });

        it('test full transpile', async () => {
            plugin.afterProgramCreate({ program: program, builder: builder });
            // program.validate();
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest extends rooibos.BaseTestSuite
                    @describe("groupA")
                    @it("is test1")
                    function Test_3()
                    end function
                end class
            `);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            expect(plugin.session.sessionInfo.suitesCount).to.equal(1);
            expect(plugin.session.sessionInfo.groupsCount).to.equal(1);
            expect(plugin.session.sessionInfo.testsCount).to.equal(1);

            expect(getContents('rooibosMain.brs')).to.eql(trimLeading(`function main()
    Rooibos_init()
end function`).trim());
            let a = getContents('test.spec.brs');
            let b = trimLeading(`function __ATest_builder()
            instance = __rooibos_BaseTestSuite_builder()
            instance.super0_new = instance.new
            instance.new = sub()
            m.super0_new()
            end sub
            instance.groupA_is_test1 = function()
            end function
            instance.super0_getTestSuiteData = instance.getTestSuiteData
            instance.getTestSuiteData = function()
            return {
            name: "ATest",
            isSolo: false,
            noCatch: false,
            isIgnored: false,
            pkgPath: "source/test.spec.bs",
            filePath: "/home/george/hope/open-source/rooibos/bsc-plugin/tmp/rootDir/source/test.spec.bs",
            lineNumber: 3,
            valid: true,
            hasFailures: false,
            hasSoloTests: false,
            hasIgnoredTests: false,
            hasSoloGroups: false,
            setupFunctionName: "",
            tearDownFunctionName: "",
            beforeEachFunctionName: "",
            afterEachFunctionName: "",
            isNodeTest: false,
            nodeName: "",
            generatedNodeName: "ATest",
            testGroups: [
            {
            name: "groupA",
            isSolo: false,
            isIgnored: false,
            filename: "source/test.spec.bs",
            lineNumber: "3",
            setupFunctionName: "",
            tearDownFunctionName: "",
            beforeEachFunctionName: "",
            afterEachFunctionName: "",
            testCases: [
            {
            isSolo: false,
            noCatch: false,
            funcName: "groupA_is_test1",
            isIgnored: false,
            isParamTest: false,
            name: "is test1",
            lineNumber: 7,
            paramLineNumber: 0,
            assertIndex: 0,
            assertLineNumberMap: {},
            rawParams: invalid,
            paramTestIndex: 0,
            expectedNumberOfParams: 0,
            isParamsValid: true
            }
            ]
            }
            ]
            }
            end function
            return instance
            end function
            function ATest()
            instance = __ATest_builder()
            instance.new()
            return instance
            end function`);
            expect(a).to.eql(b);
        });
        it('test full transpile with complex params', async () => {
            plugin.afterProgramCreate({ program: program, builder: builder });
            // program.validate();
            program.setFile('source/test.spec.bs', `
                @suite
                class ATest extends rooibos.BaseTestSuite
                    @describe("groupA")
                    @it("is test1")
                    @params({"unknown_value": "color"})
                    function Test_3(arg)
                    end function
                end class
            `);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            expect(plugin.session.sessionInfo.suitesCount).to.equal(1);
            expect(plugin.session.sessionInfo.groupsCount).to.equal(1);
            expect(plugin.session.sessionInfo.testsCount).to.equal(1);

            expect(getContents('rooibosMain.brs')).to.eql(trimLeading(`function main()
    Rooibos_init()
end function`).trim());
        });
    });

    describe('honours tags - simple tests', () => {
        let testSource = `
                @tags("one", "two", "exclude")
                @suite("a")
                class ATest extends rooibos.BaseTestSuite
                    @describe("groupA")
                    @it("is test1")
                    function t1()
                    end function
                end class
                @tags("one", "three")
                @suite("b")
                class BTest extends rooibos.BaseTestSuite
                    @describe("groupB")
                    @it("is test2")
                    function t2()
                    end function
                end class
            `;

        beforeEach(() => {
            plugin = new RooibosPlugin();
            options = {
                rootDir: _rootDir,
                stagingFolderPath: _stagingFolderPath
            };
            fsExtra.ensureDirSync(_stagingFolderPath);
            fsExtra.ensureDirSync(_rootDir);
            fsExtra.ensureDirSync(tmpPath);

            builder = new ProgramBuilder();
            builder.options = util.normalizeAndResolveConfig(options as BsConfig);
            builder.program = new Program(builder.options);
            program = builder.program;
            builder.plugins = new PluginInterface([plugin], builder.logger);
            program.plugins = new PluginInterface([plugin], builder.logger);
            program.createSourceScope(); //ensure source scope is created
            plugin.beforeProgramCreate({ builder: builder });
            plugin.fileFactory.sourcePath = path.resolve(path.join('../framework/src/source'));
            plugin.afterProgramCreate({ program: program, builder: builder });
            // program.validate();
        });
        afterEach(() => {
            fsExtra.ensureDirSync(tmpPath);
            fsExtra.emptyDirSync(tmpPath);
            builder.dispose();
            program.dispose();
        });
        it('tag one', async () => {
            plugin.session.sessionInfo.includeTags = ['one'];
            program.setFile('source/test.spec.bs', testSource);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun[0].name).to.equal('a');
            expect(plugin.session.sessionInfo.testSuitesToRun[1].name).to.equal('b');
        });
        it('tag two', async () => {
            plugin.session.sessionInfo.includeTags = ['two'];
            program.setFile('source/test.spec.bs', testSource);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun[0].name).to.equal('a');
        });
        it('tag three', async () => {
            plugin.session.sessionInfo.includeTags = ['three'];
            program.setFile('source/test.spec.bs', testSource);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun[0].name).to.equal('b');
        });
        it('tag exclude', async () => {
            plugin.session.sessionInfo.excludeTags = ['exclude'];
            program.setFile('source/test.spec.bs', testSource);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun[0].name).to.equal('b');
        });
        it('include and exclude tags', async () => {
            plugin.session.sessionInfo.includeTags = ['one', 'two'];
            plugin.session.sessionInfo.excludeTags = ['exclude'];
            program.setFile('source/test.spec.bs', testSource);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.be.empty;
        });
        it('Need all tags', async () => {
            plugin.session.sessionInfo.includeTags = ['one', 'two'];
            program.setFile('source/test.spec.bs', testSource);
            program.validate();
            await builder.transpile();
            console.log(builder.getDiagnostics());
            expect(builder.getDiagnostics()).to.have.length(1);
            expect(builder.getDiagnostics()[0].severity).to.equal(DiagnosticSeverity.Warning);
            expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
            expect(plugin.session.sessionInfo.testSuitesToRun[0].name).to.equal('a');
        });
    });


});

describe.skip('run a local project', () => {
    it('sanity checks on parsing - only run this outside of ci', () => {
        let programBuilder = new ProgramBuilder();
        let swv = {
            'stagingFolderPath': 'build',
            'rootDir': '/home/george/hope/open-source/maestro/swerve-app/src',
            'files': [
                'manifest',
                'source/**/*.*',
                'images/**/*.*',
                'sounds/**/*.*',
                'sounds/*.*',
                'fonts/**/*.*',
                'components/**/*.*'
            ],
            'autoImportComponentScript': true,
            'createPackage': false,
            'diagnosticFilters': [
                {
                    'src': '**/roku_modules/**/*.*'
                },
                {
                    'src': '**/Whitelist.xml',
                    'codes': [
                        1067
                    ]
                },
                {
                    'src': 'components/maestro/generated/**/*.*'
                },
                1013,
                {
                    'src': '**/RALETrackerTask.*'
                }
            ],
            'maestro': {
                'nodeFileDelay': 0,
                'excludeFilters': [
                    '**/roku_modules/**/*',
                    '**/*BaseTestSuite*.bs'
                ]
            },
            'sourceMap': true,
            'extends': 'bsconfig.json',
            'plugins': [
                '/home/george/hope/open-source/maestro/maestro-roku-bsc-plugin/dist/plugin.js',
                '/home/george/hope/open-source/rooibos/bsc-plugin/dist/plugin.js'
            ],
            'exclude': {
                'id': '/home/george/hope/open-source/maestro/roku-log-bsc-plugin/dist/plugin.js'
            },
            'rooibos': {
                'isRecordingCodeCoverage': false,
                'testsFilePattern': null,
                'tags': [
                    '!integration',
                    '!deprecated',
                    '!fixme'
                ],
                'showOnlyFailures': true,
                'catchCrashes': true,
                'lineWidth': 70
            },
            'rokuLog': {
                'strip': false,
                'insertPkgPath': true
            }
        };

        programBuilder.run(
            swv
            // {
            // project: '/home/george/hope/applicaster/zapp-roku-app/bsconfig-test.json'
            // project: '/home/george/hope/open-source/maestro/swerve-app/bsconfig-test.json'
            // }
        ).catch(e => {
            console.error(e);
        });
        console.log('done');
    });
});

function getContents(filename: string) {
    return trimLeading(fsExtra.readFileSync(s`${_stagingFolderPath}/source/${filename}`).toString());
}
