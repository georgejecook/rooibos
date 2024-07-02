/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { BrsFile, Editor, ExpressionStatement, FunctionExpression, Program, ProgramBuilder, Statement } from 'brighterscript';
import { Parser, WalkMode, createVisitor, BinaryExpression, createToken, TokenKind, GroupingExpression, isForStatement, isFunctionExpression, ParseMode, isFunctionStatement, isCallExpression, isVariableExpression } from 'brighterscript';
import type { RooibosConfig } from './RooibosConfig';
import { BrsTranspileState } from 'brighterscript/dist/parser/BrsTranspileState';
import { RawCodeExpression } from './RawCodeExpression';
import type { FileFactory } from './FileFactory';

export enum CodeCoverageLineType {
    noCode = 0,
    code = 1,
    condition = 2,
    branch = 3,
    function = 4
}

export class CodeCoverageProcessor {

    private coverageBrsTemplate = `
        function RBS_CC_#ID#_reportLine(lineNumber)
            _rbs_ccn = m._rbs_ccn
            if _rbs_ccn <> invalid
                _rbs_ccn.entry = { "f": #ID#, "l": lineNumber, "r": ${CodeCoverageLineType.code} }
                return true
            end if

            _rbs_ccn = m?.global?._rbs_ccn
            if _rbs_ccn <> invalid
            _rbs_ccn.entry = { "f": #ID#, "l": lineNumber, "r": ${CodeCoverageLineType.code} }
                m._rbs_ccn = _rbs_ccn
                return true
            end if
            return true
        end function

        function RBS_CC_#ID#_reportBranch(blockId, branchId)
            _rbs_ccn = m._rbs_ccn
            if _rbs_ccn <> invalid
                _rbs_ccn.entry = { "f": #ID#, "bl": blockId, "br": branchId, "r": ${CodeCoverageLineType.branch} }
                return true
            end if

            _rbs_ccn = m?.global?._rbs_ccn
            if _rbs_ccn <> invalid
                _rbs_ccn.entry = { "f": #ID#, "bl": blockId, "br": branchId, "r": ${CodeCoverageLineType.branch} }
                m._rbs_ccn = _rbs_ccn
                return true
            end if
            return true
        end function

        function RBS_CC_#ID#_reportFunction(functionId)
            _rbs_ccn = m._rbs_ccn
            if _rbs_ccn <> invalid
                _rbs_ccn.entry = { "f": #ID#, "fn": functionId, "r": ${CodeCoverageLineType.function} }
                return true
            end if

            _rbs_ccn = m?.global?._rbs_ccn
            if _rbs_ccn <> invalid
                _rbs_ccn.entry = { "f": #ID#, "fn": functionId, "r": ${CodeCoverageLineType.function} }
                m._rbs_ccn = _rbs_ccn
                return true
            end if
            return true
        end function
    `;

    constructor(builder: ProgramBuilder, fileFactory: FileFactory) {
        this.config = (builder.options as any).rooibos as RooibosConfig || {};
        this.functionMap = [];
        this.fileId = 0;
        this.fileFactory = fileFactory;
        this.processedFunctions = new Set<FunctionExpression>();
        this.baseCoverageReport = {
            files: []
        };
        try {
        } catch (e) {
            console.log('Error:', e.stack);
        }
    }

    private baseCoverageReport: CoverageMap;
    private config: RooibosConfig;
    private fileId: number;
    private blockId: number;
    private branchId: number;
    private functionMap: Array<Array<string>>;
    private executableLines: Map<number, Statement>;
    private transpileState: BrsTranspileState;
    private fileFactory: FileFactory;
    private processedStatements: Set<Statement>;
    private processedFunctions: Set<FunctionExpression>;
    private astEditor: Editor;

    private foundLines: Array<LineCoverage>;
    private foundFunctions: Array<FunctionCoverage>;
    private foundBlocks: Array<BranchCoverage>;

    public generateMetadata(isUsingCoverage: boolean, program: Program) {
        this.fileFactory.createCoverageComponent(program, this.baseCoverageReport);
    }

    public addCodeCoverage(file: BrsFile, astEditor: Editor) {
        if (this.config.isRecordingCodeCoverage) {
            this.transpileState = new BrsTranspileState(file);
            this.blockId = 0;
            this.branchId = 0;
            this._processFile(file, astEditor);
            this.fileId++;
        }
    }

    public _processFile(file: BrsFile, astEditor: Editor) {
        this.foundLines = [];
        this.foundFunctions = [];
        this.foundBlocks = [];

        this.executableLines = new Map<number, Statement>();
        this.processedStatements = new Set<Statement>();
        this.astEditor = astEditor;

        file.ast.walk(createVisitor({
            FunctionStatement: (statement, parent, owner, key) => {
                this.getFunctionIdInFile(statement, ParseMode.BrighterScript, owner, key);
            },
            Block: (statement, parent, owner, key) => {
                if (!isFunctionExpression(parent)) {

                    const lineNumber = statement.range.start.line;
                    const parsed = Parser.parse(this.getReportBranchHitFuncCallText(this.blockId, this.branchId, statement, owner, key)).ast.statements[0] as ExpressionStatement;
                    this.astEditor.addToArray(statement.statements, 0, parsed);
                    this.foundBlocks.push({
                        id: this.branchId,
                        branches: [{
                            id: this.branchId,
                            line: lineNumber,
                            totalHit: 0
                        }]
                    });
                    this.blockId++;
                    this.branchId++;

                }
            },
            ForStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                ds.forToken.text = `${this.getReportLineHitFuncCallText(ds.range.start.line, CodeCoverageLineType.code, ds, owner, key)}: for`;
            },
            IfStatement: (ifStatement, parent, owner, key) => {
                this.addStatement(ifStatement, ifStatement.range.start.line);
                (ifStatement as any).condition = new BinaryExpression(
                    new RawCodeExpression(this.getReportLineHitFuncCallText(ifStatement.condition.range.start.line, CodeCoverageLineType.condition, ifStatement, owner, key)),
                    createToken(TokenKind.And),
                    new GroupingExpression({
                        left: createToken(TokenKind.LeftParen),
                        right: createToken(TokenKind.RightParen)
                    }, ifStatement.condition)
                );

                // let blockStatements = ifStatement?.thenBranch?.statements;
                // if (blockStatements) {
                //     let coverageStatement = new RawCodeStatement(this.getReportLineHitFuncCallText(ifStatement.range.start.line, CodeCoverageLineType.branch, ifStatement, owner, key));
                //     blockStatements.splice(0, 0, coverageStatement);
                // }

                // // Handle the else blocks
                // let elseBlock = ifStatement.elseBranch;
                // if (isBlock(elseBlock) && elseBlock.statements) {
                //     let coverageStatement = new RawCodeStatement(this.getReportLineHitFuncCallText(elseBlock.range.start.line - 1, CodeCoverageLineType.branch, elseBlock, owner, key));
                //     elseBlock.statements.splice(0, 0, coverageStatement);
                // }

            },
            GotoStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);

            },
            WhileStatement: (ds, parent, owner, key) => {
                ds.tokens.while.text = `${this.getReportLineHitFuncCallText(ds.range.start.line, CodeCoverageLineType.code, ds, owner, key)}: while`;
            },
            ReturnStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);
            },
            ForEachStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                ds.tokens.forEach.text = `${this.getReportLineHitFuncCallText(ds.range.start.line, CodeCoverageLineType.code, ds, owner, key)}: for each`;
            },
            ExitWhileStatement: (ds, parent, owner, key) => {

            },
            PrintStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);
            },
            DottedSetStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);

            },
            IndexedSetStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);

            },
            IncrementStatement: (ds, parent, owner, key) => {
                this.addStatement(ds, ds.range.start.line);
                this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);

            },
            AssignmentStatement: (ds, parent, owner, key) => {
                if (!isForStatement(parent)) {
                    this.addStatement(ds, ds.range.start.line);
                    this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);
                }

            },
            ExpressionStatement: (ds, parent, owner, key) => {
                if (isCallExpression(ds.expression) && isVariableExpression(ds.expression.callee) && ds.expression.callee.name.text.startsWith('RBS_CC_')) {
                    return;
                }

                this.addStatement(ds, ds.range.start.line);
                this.convertStatementToCoverageStatement(ds, CodeCoverageLineType.code, owner, key);
            }
        }), { walkMode: WalkMode.visitAllRecursive });

        this.addBrsAPIText(file, astEditor);

        this.baseCoverageReport.files[this.fileId] = {
            sourceFile: file.pkgPath.replace('pkg:', '.').replace('\\', '/'),
            lines: this.foundLines.sort((a, b) => a.lineNumber - b.lineNumber),
            lineTotalFound: this.foundLines.length,
            lineTotalHit: 0,
            functions: this.foundFunctions.sort((a, b) => a.startLine - b.startLine),
            functionTotalFound: this.foundFunctions.length,
            functionTotalHit: 0,
            blocks: this.foundBlocks,
            branchTotalFound: this.foundBlocks.reduce((currentCount, block) => currentCount + block.branches.length, 0),
            branchTotalHit: 0
        };
    }

    private convertStatementToCoverageStatement(statement: Statement, coverageType: CodeCoverageLineType, owner: any, key: any) {
        if (this.processedStatements.has(statement)) {
            return;
        }

        const lineNumber = statement.range.start.line;
        const parsed = Parser.parse(this.getReportLineHitFuncCallText(lineNumber, coverageType, statement, owner, key)).ast.statements[0] as ExpressionStatement;
        this.astEditor.arraySplice(owner, key, 0, parsed);
        // store the statement in a set to avoid handling again after inserting statement above
        this.processedStatements.add(statement);
    }

    public addBrsAPIText(file: BrsFile, astEditor: Editor) {
        const astCodeToInject = Parser.parse(this.coverageBrsTemplate.replace(/\#ID\#/g, this.fileId.toString().trim())).ast.statements;
        astEditor.arrayPush(file.ast.statements, ...astCodeToInject);
    }

    private addStatement(statement: Statement, lineNumber: number) {
        if (!this.executableLines.has(lineNumber)) {
            this.executableLines.set(lineNumber, statement);

            this.foundLines.push({
                lineNumber: lineNumber,
                totalHit: 0
            });
        }
    }

    private getReportLineHitFuncCallText(lineNumber: number, lineType: CodeCoverageLineType, statement: Statement, owner: any, key: any) {
        const funcId = this.getFunctionIdInFile(statement, ParseMode.BrighterScript, owner, key);
        return `RBS_CC_${this.fileId}_reportLine(${lineNumber})`;
    }

    private getReportBranchHitFuncCallText(blockId: number, branchId: number, statement: Statement, owner: any, key: any) {
        const funcId = this.getFunctionIdInFile(statement, ParseMode.BrighterScript, owner, key);
        return `RBS_CC_${this.fileId}_reportBranch(${blockId}, ${branchId})`;
    }

    private getReportFunctionHitFuncCallText(functionId: number, statement: Statement) {
        return `RBS_CC_${this.fileId}_reportFunction(${functionId})`;
    }

    private getFunctionIdInFile(statement: Statement, parseMode: ParseMode, owner: any, key: any) {
        let originalFunc: FunctionExpression;
        if (isFunctionStatement(statement)) {
            originalFunc = statement.func;
        } else {
            originalFunc = statement.findAncestor(isFunctionExpression);
        }
        let func: FunctionExpression = originalFunc;

        let nameParts = [];
        while (func.parentFunction) {
            let index = func.parentFunction.childFunctionExpressions.indexOf(func);
            nameParts.unshift(`anon${index}`);
            func = func.parentFunction;
        }
        //get the index of this function in its parent
        nameParts.unshift(
            func.functionStatement.getName(parseMode)
        );

        const name = nameParts.join('$');

        if (!this.processedFunctions.has(originalFunc)) {
            this.processedFunctions.add(originalFunc);
            if (!this.functionMap[this.fileId]) {
                this.functionMap[this.fileId] = [];
            }

            const parsed = Parser.parse(this.getReportFunctionHitFuncCallText(this.functionMap[this.fileId].length, statement)).ast.statements[0] as ExpressionStatement;
            this.astEditor.addToArray(originalFunc.body.statements, 0, parsed);

            this.foundFunctions.push({
                name: name,
                startLine: originalFunc.range.start.line,
                endLine: originalFunc.range.end.line,
                totalHit: 0
            });
            this.functionMap[this.fileId].push(name);
        }

        return this.functionMap[this.fileId].indexOf(name);
    }
}


export interface CoverageMap {
    files: Array<FileCoverage>;
}

interface FileCoverage {
    sourceFile: string;
    lineTotalFound: number;
    lineTotalHit: number;
    lines: Array<LineCoverage>;
    functionTotalFound: number;
    functionTotalHit: number;
    functions: Array<FunctionCoverage>;
    branchTotalFound: number;
    branchTotalHit: number;
    blocks: Array<BranchCoverage>;
}

interface BranchCoverage {
    id: number;
    branches: Array<{
        id: number;
        totalHit: number;
        line: number;
    }>;
}
interface FunctionCoverage {
    name: string;
    totalHit: number;
    startLine: number;
    endLine: number;
}

interface LineCoverage {
    lineNumber: number;
    totalHit: number;
}

function createCovMap(files: Array<FileCoverage>) {

    let report = '';

    let covrageMap: CoverageMap = {
        files: []
    };

    for (const file of files) {
        report += `TN:\n`;
        report += `SF:${file.sourceFile}\n`;
        report += `VER:\n`;

        // Add all the found functions for the file
        for (const func of file.functions) {
            report += `FN:${func.startLine},${func.endLine},${func.name}\n`;
        }

        // Write function related data
        for (const func of file.functions) {
            if (func.totalHit > 0) {
                report += `FNDA:${func.totalHit},${func.name}\n`;
            }
        }

        report += `FNF:${file.functionTotalFound}\n`;
        report += `FNH:${file.functionTotalHit}\n`;

        // Write branch related data
        for (const block of file.blocks) {
            for (const branch of block.branches) {
                if (branch.totalHit > 0) {
                    report += `BRDA:${branch.line},${block.id},${branch.id},${branch.totalHit}\n`;
                }
            }
        }

        report += `BRF:${file.branchTotalFound}\n`;
        report += `BRH:${file.branchTotalHit}\n`;

        // Write the per line related data
        for (const line of file.lines) {
            report += `DA:${line.lineNumber},${line.totalHit}`;
        }

        report += `LF:${file.lineTotalFound}\n`;
        report += `LH:${file.lineTotalHit}\n`;
        report += `end_of_record\n`;
    }
}




// function write_info($$$) {
//     my $self = $_[0];
//     local *INFO_HANDLE = $_[1];
//     my $checksum = defined($_[2]) ? $_[2] : 0;
//     my $br_found;
//     my $br_hit;
//     my $ln_total_found = 0;
//     my $ln_total_hit = 0;
//     my $fn_total_found = 0;
//     my $fn_total_hit = 0;
//     my $br_total_found = 0;
//     my $br_total_hit = 0;

//     my $srcReader = ReadCurrentSource->new()
//       if (lcovutil::is_filter_enabled());

//     foreach my $source_file (sort($self->files())) {
//       next if lcovutil::is_external($source_file);
//       my $entry = $self->data($source_file);
//       die("expected TraceInfo, got '" . ref($entry) . "'")
//         unless('TraceInfo' eq ref($entry));

//       my ($testdata, $sumcount, $funcdata, $checkdata, $testfncdata,
//           $testbrdata, $sumbrcount, $found, $hit,
//           $f_found, $f_hit, $br_found, $br_hit) = $entry->get_info();

//       # munge the source file name, if requested
//       $source_file = lcovutil::subst_file_name($source_file);
//       # Add to totals
//       $ln_total_found += $found;
//       $ln_total_hit += $hit;
//       $fn_total_found += $f_found;
//       $fn_total_hit += $f_hit;
//       $br_total_found += $br_found;
//       $br_total_hit += $br_hit;

//       foreach my $testname (sort($testdata->keylist())) {
//         my $testcount = $testdata->value($testname);
//         my $testfnccount = $testfncdata->value($testname);
//         my $testbrcount = $testbrdata->value($testname);
//         $found = 0;
//         $hit   = 0;

//         print(INFO_HANDLE "TN:$testname\n");
//         print(INFO_HANDLE "SF:$source_file\n");
//         print(INFO_HANDLE "VER:" . $entry->version() . "\n")
//           if defined($entry->version());
//         if (defined($srcReader)) {
//           $srcReader->close();
//           if (is_c_file($source_file)) {
//             lcovutil::debug("reading $source_file for lcov filtering\n");
//             if (-e $source_file) {
//               $srcReader->open($source_file);
//             } else {
//               lcovutil::ignorable_error($lcovutil::ERROR_SOURCE,
//                                         "'$source_file' not found (for filtering)")
//                 if (lcovutil::warn_once($source_file));
//             }
//           } else {
//             lcovutil::debug("not reading $source_file: no ext match\n");
//           }
//         }
//         my $functionMap = $testfncdata->{$testname};
//         # Write function related data - sort  by line number
//         foreach my $key ( sort({$functionMap->findKey($a)->line() <=> $functionMap->findKey($b)->line()}
//                                 $functionMap->keylist())) {
//           my $data = $functionMap->findKey($key);
//           my $aliases = $data->aliases();
//           foreach my $alias (keys %$aliases) {
//             print(INFO_HANDLE "FN:" . $data->line(). ",$alias\n");
//           }
//         }
//         my $f_found = 0;
//         my $f_hit = 0;
//         foreach my $key ($functionMap->keylist()) {
//           my $data = $functionMap->findKey($key);
//           my $aliases = $data->aliases();
//           foreach my $alias (keys %$aliases) {
//             my $hit = $aliases->{$alias};
//             ++ $f_found;
//             ++ $f_hit if $hit > 0;
//             print(INFO_HANDLE "FNDA:$hit,$alias\n");
//           }
//         }
//         print(INFO_HANDLE "FNF:$f_found\n");
//         print(INFO_HANDLE "FNH:$f_hit\n");

//         # Write branch related data
//         $br_found = 0;
//         $br_hit = 0;
//         my $currentBranchLine;
//         my $skipBranch = 0;
//         my $reader = $srcReader
//           if (defined($srcReader) && $srcReader->notEmpty());
//         my $branchHistogram = $cov_filter[$FILTER_BRANCH_NO_COND]
//           if $reader;

//         foreach my $line (sort({$a <=> $b}
//                                $testbrcount->keylist())) {

//           # omit if line excluded or branches excluded on this line
//           next
//             if (defined($reader) &&
//                 ($reader->isOutOfRange($line, 'branch') ||
//                  $reader->isExcluded($line, 1)));

//           my $brdata = $testbrcount->value($line);
//           if (defined($branchHistogram)) {
//             $skipBranch = ! $reader->containsConditional($line);
//             if ($skipBranch) {
//               ++ $branchHistogram->[0]; # one line where we skip
//               $branchHistogram->[1] += scalar($brdata->blocks());
//               lcovutil::info(2, "skip BRDA '" .
//                              $reader->getLine($line) .
//                              "' $source_file:$line\n");
//               next;
//             }
//           }
//           # want the block_id to be treated as 32-bit unsigned integer
//           #  (need masking to match regression tests)
//           my $mask =  (1<<32) -1;
//           foreach my $block_id ($brdata->blocks()) {
//             my $blockData = $brdata->getBlock($block_id);
//             $block_id &= $mask;
//             foreach my $br (@$blockData) {
//               my $taken = $br->data();
//               my $branch_id = $br->id();
//               my $branch_expr = $br->expr();
//               # mostly for Verilog:  if there is a branch expression: use it.
//               printf(INFO_HANDLE "BRDA:%u,%u,%s,%s\n",
//                      $line, $block_id,
//                      defined($branch_expr) ? $branch_expr : $branch_id, $taken);
//               $br_found++;
//               $br_hit++
//                 if ($taken ne '-' && $taken > 0);
//             }
//           }
//         }
//         if ($br_found > 0) {
//           print(INFO_HANDLE "BRF:$br_found\n");
//           print(INFO_HANDLE "BRH:$br_hit\n");
//         }

//         # Write line related data
//         my ($brace_histogram, $blank_histogram);
//         if (defined($reader)) {
//           $brace_histogram = $cov_filter[$FILTER_LINE_CLOSE_BRACE];
//           $blank_histogram = $cov_filter[$FILTER_BLANK_LINE];
//         }
//         foreach my $line (sort({$a <=> $b} $testcount->keylist())) {
//           next
//             if (defined($reader) &&
//                 ($reader->isOutOfRange($line, 'line') || $reader->isExcluded($line)));

//           my $l_hit = $testcount->value($line);
//           if ( ! defined($sumbrcount->value($line))) {
//             # don't suppresss if this line has associated branch data

//             if ($brace_histogram &&
//                 $reader->suppressCloseBrace($line, $l_hit, $testcount)) {
//               lcovutil::info(2, "skip DA '" . $reader->getLine($line)
//                              . "' $source_file:$line\n");
//               ++$brace_histogram->[0]; # one location where this applied
//               ++$brace_histogram->[1]; # one coverpoint suppressed
//               next;
//             } elsif ($blank_histogram &&
//                      $l_hit == 0 &&
//                      $reader->isBlank($line)) {
//               lcovutil::info(2, "skip DA (empty) $source_file:$line\n");
//               ++ $blank_histogram->[0]; # one location where this applied
//               ++ $blank_histogram->[1]; # one coverpoint suppressed
//               next;
//             }
//           }
//           my $chk = $checkdata->{$line};
//           print(INFO_HANDLE "DA:$line,$l_hit" .
//                 (defined($chk) && $checksum ? ",". $chk : "")
//                 ."\n");
//           $found++;
//           $hit++
//             if ($l_hit > 0);
//         }
//         print(INFO_HANDLE "LF:$found\n");
//         print(INFO_HANDLE "LH:$hit\n");
//         print(INFO_HANDLE "end_of_record\n");
//       }
//     }

//     return ($ln_total_found, $ln_total_hit, $fn_total_found, $fn_total_hit,
//             $br_total_found, $br_total_hit);
//   }