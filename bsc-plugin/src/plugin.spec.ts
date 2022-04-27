import { DiagnosticSeverity, Program, ProgramBuilder, util, standardizePath as s } from 'brighterscript';
import { expect } from 'chai';
import { RooibosPlugin } from './plugin';
import PluginInterface from 'brighterscript/dist/PluginInterface';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as trim from 'trim-whitespace';
import undent from 'undent';
let tmpPath = s`${process.cwd()}/tmp`;
let _rootDir = s`${tmpPath}/rootDir`;
let _stagingFolderPath = s`${tmpPath}/staging`;

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
        builder.options = util.normalizeAndResolveConfig(options);
        builder.program = new Program(builder.options);
        program = builder.program;
        builder.plugins = new PluginInterface([plugin], builder.logger);
        program.plugins = new PluginInterface([plugin], builder.logger);
        program.createSourceScope(); //ensure source scope is created
        plugin.beforeProgramCreate(builder);
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
            plugin.afterProgramCreate(program);
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

            expect(
                getContents('rooibosMain.brs')
            ).to.eql(undent`
                function main()
                    Rooibos_init()
                end function
            `);
            expect(
                getContents('test.spec.brs')
            ).to.eql(undent`
                function __ATest_builder()
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
                            pkgPath: "${s`source/test.spec.bs`}",
                            filePath: "${s`${tmpPath}/rootDir/source/test.spec.bs`}",
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
                                    filename: "${s`source/test.spec.bs`}",
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
                end function
            `);
        });

        it('test full transpile with complex params', async () => {
            plugin.afterProgramCreate(program);
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

            expect(
                getContents('rooibosMain.brs')
            ).to.eql(undent`
                function main()
                    Rooibos_init()
                end function
            `);
        });

        describe('expectCalled transpilation', () => {
            it('correctly transpiles call funcs', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.expectCalled(m.thing@.getFunction())
                        m.expectCalled(m.thing@.getFunction(), "return")
                        m.expectCalled(m.thing@.getFunction("a", "b"))
                        m.expectCalled(m.thing@.getFunction("a", "b"), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents(true)
                ).to.eql(undent`
                    m.currentAssertLineNumber = 6
                    m._expectCalled(m.thing, "callFunc", [
                    "getFunction"
                    ])
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 7
                    m._expectCalled(m.thing, "callFunc", [
                    "getFunction"
                    ], "return")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 8
                    m._expectCalled(m.thing, "callFunc", [
                    "getFunction",
                    "a",
                    "b"
                    ])
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 9
                    m._expectCalled(m.thing, "callFunc", [
                    "getFunction",
                    "a",
                    "b"
                    ], "return")
                    if m.currentResult.isFail then return invalid
                `);
            });

            it('correctly transpiles func pointers', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.expectCalled(m.thing.getFunctionField)
                        m.expectCalled(m.thing.getFunctionField, "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m.currentAssertLineNumber = 6
                    m._expectCalled(m.thing, "getFunctionField", invalid)
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 7
                    m._expectCalled(m.thing, "getFunctionField", invalid, "return")
                    if m.currentResult.isFail then return invalid
                `);
            });

            it('correctly transpiles function invocations', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.expectCalled(m.thing.getFunction())
                        m.expectCalled(m.thing.getFunction(), "return")
                        m.expectCalled(m.thing.getFunction("arg1", "arg2"))
                        m.expectCalled(m.thing.getFunction("arg1", "arg2"), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents(true)
                ).to.eql(undent`
                    m.currentAssertLineNumber = 6
                    m._expectCalled(m.thing, "getFunction", [])
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 7
                    m._expectCalled(m.thing, "getFunction", [], "return")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 8
                    m._expectCalled(m.thing, "getFunction", [
                    "arg1",
                    "arg2"
                    ])
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 9
                    m._expectCalled(m.thing, "getFunction", [
                    "arg1",
                    "arg2"
                    ], "return")
                    if m.currentResult.isFail then return invalid
                `);
            });

            it('correctly transpiles function invocations - simple object', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        item = {id: "item"}
                        m.expectCalled(item.getFunction())
                        m.expectCalled(item.getFunction(), "return")
                        m.expectCalled(item.getFunction("arg1", "arg2"))
                        m.expectCalled(item.getFunction("arg1", "arg2"), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents(true)
                ).to.eql(undent`
                    item = {
                    id: "item"
                    }

                    m.currentAssertLineNumber = 7
                    m._expectCalled(item, "getFunction", [])
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 8
                    m._expectCalled(item, "getFunction", [], "return")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 9
                    m._expectCalled(item, "getFunction", [
                    "arg1",
                    "arg2"
                    ])
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 10
                    m._expectCalled(item, "getFunction", [
                    "arg1",
                    "arg2"
                    ], "return")
                    if m.currentResult.isFail then return invalid
                `);
            });
        });

        describe('stubCall transpilation', () => {
            it('correctly transpiles call funcs', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                            m.stubCall(m.thing@.getFunction())
                            m.stubCall(m.thing@.getFunction(), "return")
                            m.stubCall(m.thing@.getFunction("a", "b"))
                            m.stubCall(m.thing@.getFunction("a", "b"), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m._stubCall(m.thing, "callFunc")
                    m._stubCall(m.thing, "callFunc", "return")
                    m._stubCall(m.thing, "callFunc")
                    m._stubCall(m.thing, "callFunc", "return")
                `);
            });

            it('correctly transpiles func pointers', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.stubCall(m.thing.getFunctionField)
                        m.stubCall(m.thing.getFunctionField, "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m._stubCall(m.thing, "getFunctionField")
                    m._stubCall(m.thing, "getFunctionField", "return")
                `);
            });

            it('correctly transpiles func pointers - simple', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        item = {id:"item"}
                        m.stubCall(item.getFunctionField)
                        m.stubCall(item.getFunctionField, "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    item = {
                        id: "item"
                    }
                    m._stubCall(item, "getFunctionField")
                    m._stubCall(item, "getFunctionField", "return")
                `);
            });

            it('correctly transpiles function invocations', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.stubCall(m.thing.getFunction())
                        m.stubCall(m.thing.getFunction(), "return")
                        m.stubCall(m.thing.getFunction("arg1", "arg2"))
                        m.stubCall(m.thing.getFunction("arg1", "arg2"), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m._stubCall(m.thing, "getFunction")
                    m._stubCall(m.thing, "getFunction", "return")
                    m._stubCall(m.thing, "getFunction")
                    m._stubCall(m.thing, "getFunction", "return")
                `);
            });

            it('correctly transpiles function invocations - simple object', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        item = {id: "item"}
                        m.stubCall(item.getFunction())
                        m.stubCall(item.getFunction(), "return")
                        m.stubCall(item.getFunction("arg1", "arg2"))
                        m.stubCall(item.getFunction("arg1", "arg2"), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    item = {
                        id: "item"
                    }
                    m._stubCall(item, "getFunction")
                    m._stubCall(item, "getFunction", "return")
                    m._stubCall(item, "getFunction")
                    m._stubCall(item, "getFunction", "return")
                `);
            });
        });

        describe('expectNotCalled transpilation', () => {
            it('correctly transpiles call funcs', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.expectNotCalled(m.thing@.getFunction())
                        m.expectNotCalled(m.thing@.getFunction(), "return")
                        m.expectNotCalled(m.thing@.getFunction())
                        m.expectNotCalled(m.thing@.getFunction(), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m.currentAssertLineNumber = 6
                    m._expectNotCalled(m.thing, "callFunc")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 7
                    m._expectNotCalled(m.thing, "callFunc", "return")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 8
                    m._expectNotCalled(m.thing, "callFunc")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 9
                    m._expectNotCalled(m.thing, "callFunc", "return")
                    if m.currentResult.isFail then return invalid
                `);
            });

            it('correctly transpiles callfuncs on simple objects', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.expectNotCalled(thing@.getFunction())
                        m.expectNotCalled(thing@.getFunction("arg1", "arg2"))
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m.currentAssertLineNumber = 6
                    m._expectNotCalled(thing, "callFunc")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 7
                    m._expectNotCalled(thing, "callFunc")
                    if m.currentResult.isFail then return invalid
                `);
            });

            it('correctly transpiles func pointers', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.expectNotCalled(m.thing.getFunctionField)
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m.currentAssertLineNumber = 6
                    m._expectNotCalled(m.thing, "getFunctionField")
                    if m.currentResult.isFail then return invalid
                `);
            });

            it('correctly transpiles function invocations', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        m.expectNotCalled(m.thing.getFunction())
                        m.expectNotCalled(m.thing.getFunction(), "return")
                        m.expectNotCalled(m.thing.getFunction())
                        m.expectNotCalled(m.thing.getFunction(), "return")
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents()
                ).to.eql(undent`
                    m.currentAssertLineNumber = 6
                    m._expectNotCalled(m.thing, "getFunction")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 7
                    m._expectNotCalled(m.thing, "getFunction", "return")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 8
                    m._expectNotCalled(m.thing, "getFunction")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 9
                    m._expectNotCalled(m.thing, "getFunction", "return")
                    if m.currentResult.isFail then return invalid
                `);
            });

            it('correctly transpiles function invocations - simple object', async () => {
                program.setFile('source/test.spec.bs', `
                    @suite
                    class ATest
                        @describe("groupA")
                        @it("test1")
                        function _()
                        item = {id: "item"}
                        m.expectNotCalled(item.getFunction())
                        m.expectNotCalled(item.getFunction())
                        end function
                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                expect(plugin.session.sessionInfo.testSuitesToRun).to.not.be.empty;
                await builder.transpile();
                expect(
                    getTestFunctionContents(true)
                ).to.eql(undent`
                    item = {
                    id: "item"
                    }

                    m.currentAssertLineNumber = 7
                    m._expectNotCalled(item, "getFunction")
                    if m.currentResult.isFail then return invalid


                    m.currentAssertLineNumber = 8
                    m._expectNotCalled(item, "getFunction")
                    if m.currentResult.isFail then return invalid
                `);
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
                builder.options = util.normalizeAndResolveConfig(options);
                builder.program = new Program(builder.options);
                program = builder.program;
                builder.plugins = new PluginInterface([plugin], builder.logger);
                program.plugins = new PluginInterface([plugin], builder.logger);
                program.createSourceScope(); //ensure source scope is created
                plugin.beforeProgramCreate(builder);
                plugin.fileFactory.sourcePath = path.resolve(path.join('../framework/src/source'));
                plugin.afterProgramCreate(program);
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
                'rootDir': '/home/george/hope/open-source/rooibos/tests',
                'files': ['manifest', 'source/**/*.*', 'components/**/*.*'],
                'autoImportComponentScript': true,
                'createPackage': false,
                'diagnosticFilters': [
                    {
                        'src': '**/roku_modules/**/*.*',
                        'codes': [1107, 1009]
                    }
                ],
                'rooibos': {
                    'showOnlyFailures': true,
                    'catchCrashes': true,
                    'lineWidth': 70,
                    'failFast': false,
                    'sendHomeOnFinish': false
                },
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
                'rokuLog': {
                    'strip': false,
                    'insertPkgPath': true
                }
            };

            programBuilder.run(
                // swv
                {
                    project: '/home/george/hope/open-source/rooibos/tests/bsconfig.json'
                    // project: '/home/george/hope/open-source/maestro/swerve-app/bsconfig-test.json'
                }
            ).catch(e => {
                console.error(e);
            });
            console.log('done');
        });
    });
});

function getContents(filename: string) {
    return undent(
        fsExtra.readFileSync(s`${_stagingFolderPath}/source/${filename}`).toString()
    );
}

function getTestFunctionContents(trimEveryLine = false) {
    const contents = getContents('test.spec.brs');
    const [, body] = /\= function\(\)([\S\s]*|.*)(?=end function)/gim.exec(contents);
    let result = undent(
        body.split('end function')[0]
    );
    if (trimEveryLine) {
        result = trim(result);
    }
    return result;
}
