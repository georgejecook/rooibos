/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { Program, ProgramBuilder, util, standardizePath as s } from 'brighterscript';
import { expect } from 'chai';
import PluginInterface from 'brighterscript/dist/PluginInterface';
import * as fsExtra from 'fs-extra';
import { RooibosPlugin } from '../../plugin';
import undent from 'undent';

let tmpPath = s`${process.cwd()}/tmp`;
let _rootDir = s`${tmpPath}/rootDir`;
let _stagingFolderPath = s`${tmpPath}/staging`;

describe('RooibosPlugin', () => {
    let program: Program;
    let builder: ProgramBuilder;
    let plugin: RooibosPlugin;
    let options;

    function getContents(filename: string) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        let contents = fsExtra.readFileSync(s`${_stagingFolderPath}/${filename}`).toString();
        return undent(contents);
    }

    describe('CodeCoverageProcessor', () => {
        beforeEach(() => {
            plugin = new RooibosPlugin();
            options = {
                rootDir: _rootDir,
                stagingFolderPath: _stagingFolderPath,
                rooibos: {
                    isRecordingCodeCoverage: true,
                    coverageExcludedFiles: [
                        '**/*.coverageExcluded.bs'
                    ]
                },
                allowBrighterScriptInBrightScript: true
            };
            fsExtra.ensureDirSync(_stagingFolderPath);
            fsExtra.ensureDirSync(_rootDir);
            fsExtra.ensureDirSync(tmpPath);

            builder = new ProgramBuilder();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            builder.options = util.normalizeAndResolveConfig(options);
            builder.program = new Program(builder.options);
            program = builder.program;
            program.logger = builder.logger;
            builder.plugins = new PluginInterface([plugin], { logger: builder.logger });
            program.plugins = new PluginInterface([plugin], { logger: builder.logger });
            program.createSourceScope(); //ensure source scope is created
            plugin.beforeProgramCreate(builder);

        });
        afterEach(() => {
            plugin.afterProgramCreate(program);
            fsExtra.ensureDirSync(tmpPath);
            fsExtra.emptyDirSync(tmpPath);
            builder.dispose();
            program.dispose();
        });

        describe('basic brs tests', () => {

            // This test fails unless `allowBrighterScriptInBrightScript` is set to true when setting up the program
            // in `beforeEach`. This is because the compiler normally skips processing .brs files and copies them as-is.
            it('adds code coverage to a brs file', async () => {
                program.setFile('source/code.brs', `
                    function new(a1, a2)
                        c = 0
                        text = ""
                        for i = 0 to 10
                            text = text + "hello"
                            c++
                            c += 1
                            if c = 2
                                ? "is true"
                            end if

                            if c = 3
                                ? "free"
                            else
                                ? "not free"
                            end if
                        end for
                    end function
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                await builder.transpile();
                let a = getContents('source/code.brs');
                let b = undent(`
                    function new(a1, a2)
                        RBS_CC_0_reportFunction(0)
                        RBS_CC_0_reportLine(2)
                        c = 0
                        RBS_CC_0_reportLine(3)
                        text = ""
                        RBS_CC_0_reportLine(4): for i = 0 to 10
                            RBS_CC_0_reportBranch(0, 0)
                            RBS_CC_0_reportLine(5)
                            text = text + "hello"
                            RBS_CC_0_reportLine(6)
                            c++
                            RBS_CC_0_reportLine(7)
                            c += 1
                            if RBS_CC_0_reportLine(8) and (c = 2)
                                RBS_CC_0_reportBranch(1, 1)
                                RBS_CC_0_reportLine(9)
                                ? "is true"
                            end if
                            if RBS_CC_0_reportLine(12) and (c = 3)
                                RBS_CC_0_reportBranch(2, 2)
                                RBS_CC_0_reportLine(13)
                                ? "free"
                            else
                                RBS_CC_0_reportBranch(3, 3)
                                RBS_CC_0_reportLine(15)
                                ? "not free"
                            end if
                        end for
                    end function

                    function RBS_CC_0_reportLine(lineNumber)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportBranch(blockId, branchId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportFunction(functionId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function
                `);
                expect(a).to.equal(b);

            });
        });
        describe('basic bs tests', () => {

            it('adds code coverage to a bs file', async () => {
                program.setFile('source/code.bs', `
                    function new(a1, a2)
                    c = 0
                    text = ""
                        for i = 0 to 10
                            text = text + "hello"
                            c++
                            c += 1
                            if c = 2
                                ? "is true"
                            end if

                            if c = 3
                                ? "free"
                            else
                                ? "not free"
                            end if
                        end for
                    end function
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                await builder.transpile();
                let a = getContents('source/code.brs');
                let b = undent(`
                    function new(a1, a2)
                        RBS_CC_0_reportFunction(0)
                        RBS_CC_0_reportLine(2)
                        c = 0
                        RBS_CC_0_reportLine(3)
                        text = ""
                        RBS_CC_0_reportLine(4): for i = 0 to 10
                            RBS_CC_0_reportBranch(0, 0)
                            RBS_CC_0_reportLine(5)
                            text = text + "hello"
                            RBS_CC_0_reportLine(6)
                            c++
                            RBS_CC_0_reportLine(7)
                            c += 1
                            if RBS_CC_0_reportLine(8) and (c = 2)
                                RBS_CC_0_reportBranch(1, 1)
                                RBS_CC_0_reportLine(9)
                                ? "is true"
                            end if
                            if RBS_CC_0_reportLine(12) and (c = 3)
                                RBS_CC_0_reportBranch(2, 2)
                                RBS_CC_0_reportLine(13)
                                ? "free"
                            else
                                RBS_CC_0_reportBranch(3, 3)
                                RBS_CC_0_reportLine(15)
                                ? "not free"
                            end if
                        end for
                    end function

                    function RBS_CC_0_reportLine(lineNumber)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportBranch(blockId, branchId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportFunction(functionId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function
                `);
                expect(a).to.equal(b);

            });
        });

        describe('basic tests', () => {

            it('adds code coverage to a bs file', async () => {
                program.setFile('source/code.bs', `
                    class BasicClass
                        private field1
                        public field2

                        function new(a1, a2)
                        c = 0
                        text = ""
                            for i = 0 to 10
                                text = text + "hello"
                                c++
                                c += 1
                                if c = 2
                                    ? "is true"
                                end if

                                if c = 3
                                    ? "free"
                                else
                                    ? "not free"
                                end if
                            end for

                        end function


                    end class
                `);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                await builder.transpile();
                let a = getContents('source/code.brs');
                let b = undent(`
                    function __BasicClass_builder()
                        instance = {}
                        instance.new = function(a1, a2)
                            m.field1 = invalid
                            m.field2 = invalid
                            RBS_CC_0_reportLine(6)
                            RBS_CC_0_reportFunction(0)
                            c = 0
                            RBS_CC_0_reportLine(7)
                            text = ""
                            RBS_CC_0_reportLine(8): for i = 0 to 10
                                RBS_CC_0_reportBranch(0, 0)
                                RBS_CC_0_reportLine(9)
                                text = text + "hello"
                                RBS_CC_0_reportLine(10)
                                c++
                                RBS_CC_0_reportLine(11)
                                c += 1
                                if RBS_CC_0_reportLine(12) and (c = 2)
                                    RBS_CC_0_reportBranch(1, 1)
                                    RBS_CC_0_reportLine(13)
                                    ? "is true"
                                end if
                                if RBS_CC_0_reportLine(16) and (c = 3)
                                    RBS_CC_0_reportBranch(2, 2)
                                    RBS_CC_0_reportLine(17)
                                    ? "free"
                                else
                                    RBS_CC_0_reportBranch(3, 3)
                                    RBS_CC_0_reportLine(19)
                                    ? "not free"
                                end if
                            end for
                        end function
                        return instance
                    end function
                    function BasicClass(a1, a2)
                        instance = __BasicClass_builder()
                        instance.new(a1, a2)
                        return instance
                    end function

                    function RBS_CC_0_reportLine(lineNumber)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportBranch(blockId, branchId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportFunction(functionId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function
                `);
                expect(a).to.equal(b);
            });

            it('correctly transpiles some statements', async () => {
                const source = `sub foo()
                    x = function(y)
                        if (true) then
                            return 1
                        end if
                        return 0
                    end function
                end sub`;

                program.setFile('source/code.bs', source);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                await builder.transpile();

                let a = getContents('source/code.brs');
                let b = undent(`
                    sub foo()
                        RBS_CC_0_reportFunction(0)
                        RBS_CC_0_reportLine(1)
                        x = function(y)
                            RBS_CC_0_reportFunction(1)
                            if RBS_CC_0_reportLine(2) and ((true)) then
                                RBS_CC_0_reportBranch(0, 0)
                                RBS_CC_0_reportLine(3)
                                return 1
                            end if
                            RBS_CC_0_reportLine(5)
                            return 0
                        end function
                    end sub

                    function RBS_CC_0_reportLine(lineNumber)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportBranch(blockId, branchId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportFunction(functionId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function
                `);

                expect(a).to.equal(b);
            });

            it('correctly transpiles some statements', async () => {
                const source = `
                    sub foo(action as string)
                        if action = "action1" then
                            print "action1"
                        else if action = "action2" or action = "action2" then
                            print "action2"
                        else if action = "action3" then
                            print "action3"
                        else if action = "action4" then
                        else if action = "action5" then
                            print "action5"
                        else if action = "action6" then
                            print "action6"
                        else if action = "action7" then
                            print "action7"
                        else if action = "action8" then
                            print "action8"
                        else if action = "action9" then
                            print "action9"
                        else if action = "action10" then
                            print "action10"
                        else
                        end if
                    end sub
                `;

                program.setFile('source/code.bs', source);
                program.validate();
                expect(program.getDiagnostics()).to.be.empty;
                await builder.transpile();

                let a = getContents('source/code.brs');
                let b = undent(`
                    sub foo(action as string)
                        RBS_CC_0_reportFunction(0)
                        if RBS_CC_0_reportLine(2) and (action = "action1") then
                            RBS_CC_0_reportBranch(0, 0)
                            RBS_CC_0_reportLine(3)
                            print "action1"
                        else if RBS_CC_0_reportLine(4) and (action = "action2" or action = "action2") then
                            RBS_CC_0_reportBranch(1, 1)
                            RBS_CC_0_reportLine(5)
                            print "action2"
                        else if RBS_CC_0_reportLine(6) and (action = "action3") then
                            RBS_CC_0_reportBranch(2, 2)
                            RBS_CC_0_reportLine(7)
                            print "action3"
                        else if RBS_CC_0_reportLine(8) and (action = "action4") then
                            RBS_CC_0_reportBranch(3, 3)
                        else if RBS_CC_0_reportLine(9) and (action = "action5") then
                            RBS_CC_0_reportBranch(4, 4)
                            RBS_CC_0_reportLine(10)
                            print "action5"
                        else if RBS_CC_0_reportLine(11) and (action = "action6") then
                            RBS_CC_0_reportBranch(5, 5)
                            RBS_CC_0_reportLine(12)
                            print "action6"
                        else if RBS_CC_0_reportLine(13) and (action = "action7") then
                            RBS_CC_0_reportBranch(6, 6)
                            RBS_CC_0_reportLine(14)
                            print "action7"
                        else if RBS_CC_0_reportLine(15) and (action = "action8") then
                            RBS_CC_0_reportBranch(7, 7)
                            RBS_CC_0_reportLine(16)
                            print "action8"
                        else if RBS_CC_0_reportLine(17) and (action = "action9") then
                            RBS_CC_0_reportBranch(8, 8)
                            RBS_CC_0_reportLine(18)
                            print "action9"
                        else if RBS_CC_0_reportLine(19) and (action = "action10") then
                            RBS_CC_0_reportBranch(9, 9)
                            RBS_CC_0_reportLine(20)
                            print "action10"
                        else
                            RBS_CC_0_reportBranch(10, 10)
                        end if
                    end sub

                    function RBS_CC_0_reportLine(lineNumber)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "l": lineNumber
                                "r": 1
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportBranch(blockId, branchId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "bl": blockId
                                "br": branchId
                                "r": 3
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function

                    function RBS_CC_0_reportFunction(functionId)
                        _rbs_ccn = m._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            return true
                        end if
                        _rbs_ccn = m?.global?._rbs_ccn
                        if _rbs_ccn <> invalid
                            _rbs_ccn.entry = {
                                "f": 0
                                "fn": functionId
                                "r": 4
                            }
                            m._rbs_ccn = _rbs_ccn
                            return true
                        end if
                        return true
                    end function
                `);

                expect(a).to.equal(b);
            });
        });

        it('excludes files from coverage', async () => {
            const source = `sub foo()
                x = function(y)
                    if (true) then
                        return 1
                    end if
                    return 0
                end function
            end sub`;

            program.setFile('source/code.coverageExcluded.bs', source);
            program.validate();
            expect(program.getDiagnostics()).to.be.empty;
            await builder.transpile();

            let a = getContents('source/code.coverageExcluded.brs');
            let b = undent(`
                sub foo()
                    x = function(y)
                        if (true) then
                            return 1
                        end if
                        return 0
                    end function
                end sub
            `);

            expect(a).to.equal(b);
        });
    });
});
