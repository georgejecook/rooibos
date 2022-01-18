/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { BrsFile, ProgramBuilder } from 'brighterscript';
import type { RooibosConfig } from './RooibosConfig';

export class CodeCoverageProcessor {

    constructor(builder: ProgramBuilder) {
        this._config = (builder.options as any).rooibos as RooibosConfig || {};
        this._fileId = 0;
        try {
            // this._coverageBrsTemplate = fs.readFileSync(path.join(__dirname, './CodeCoverageTemplate.brs'), 'utf8');
            // this._coverageComponentBrsTemplate = fs.readFileSync(path.join(__dirname, './CodeCoverage.brs'), 'utf8');
            // this._coverageComponentXmlTemplate = fs.readFileSync(path.join(__dirname, './CodeCoverage.xml'), 'utf8');
            // this._coverageSupportTemplate = fs.readFileSync(path.join(__dirname, './CodeCoverageSupport.brs'), 'utf8');
        } catch (e) {
            // console.log('Error:', e.stack);
        }
    }

    private _config: RooibosConfig;
    private _fileId: number;
    private _coverageBrsTemplate: string;

    public generateMetadata() {
        //DO when everythin is ran
        this.createCoverageComponent();
        this.createCoverageSupport();
    }

    public addCodeCoverage(file: BrsFile) {
        //not yet supported
        if (false && this._config.isRecordingCodeCoverage) {
            this._processFile();
        }
        //if matches glob
        // this._processFile(file);
        //
    }

    public _processFile() {
        // this._fileId++;
        // let fileContents = '';
        // let lines = file.getFileContents().split(/\r?\n/);
        // let coverageMap: Map<number, number> = new Map<number, number>();
        // this.visitableLines = new Map<number, Statement>();
        // this.getVisitableLinesForStatements(file.ast);
        // //TODO - walks the ast
        // for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        //   let line = lines[lineNumber];
        //   let statement = this.visitableLines.get(lineNumber);
        //   let coverageType = CodeCoverageLineType.noCode;
        //   if (statement) {
        //     if (statement instanceof IfStatement) {
        //       let conditionStartPos = statement.condition.range.start.character;
        //       let conditionEndPos = statement.condition.range.end.character;
        //       let funcCall = this.getFuncCallText(lineNumber, CodeCoverageLineType.condition);
        //       let conditionText = line.substr(conditionStartPos, conditionEndPos - conditionStartPos);
        //       let restofLineText = line.substring(conditionEndPos);
        //       line = `${line.substr(0, conditionStartPos)} ${funcCall} and (${conditionText}) ${restofLineText}`;
        //       coverageType = CodeCoverageLineType.condition;
        //     } else if (statement instanceof IfStatement) {
        //       // let conditionStartPos = statement.condition.location.start.column;
        //       // let conditionEndPos = statement.condition.location.end.column;
        //       // let funcCall = this.getFuncCallText(lineNumber, CodeCoverageLineType.condition);
        //       // let conditionText = line.substr(conditionStartPos, conditionEndPos - conditionStartPos);
        //       // let restofLineText = line.substring(conditionEndPos);
        //       // line = `${line.substr(0, conditionStartPos)} ${funcCall} and (${conditionText}) ${restofLineText}`;
        //       // coverageType = CodeCoverageLineType.condition;
        //     } else {
        //       //all types that can be prefixed with the funcall and a colon (i.e for, while, return foreach, assign)
        //       let funcCall = this.getFuncCallText(lineNumber, CodeCoverageLineType.code);
        //       line = `${funcCall}: ${line}`;
        //       coverageType = CodeCoverageLineType.code;
        //     }
        //   } else {
        //    `could not ascertain symbol type for line "${line} - ignoring`);
        //   }

        //   if (!line.endsWith('\n')) {
        //     line += '\n';
        //   }
        //   fileContents += line;
        //   if (coverageType > CodeCoverageLineType.noCode) {
        //     coverageMap.set(lineNumber, coverageType);
        //   }
        // }
        // this._expectedCoverageMap[this._fileId.toString().trim()] = Array.from(coverageMap);
        // this._filePathMap[this._fileId] = file.pkgUri;
        // fileContents += this.getBrsAPIText();
        // file.setFileContents(fileContents);
        //`Writing to ${file.fullPath}`);
        // file.saveFileContents();
    }

    public getBrsAPIText(): string {
        let template = this._coverageBrsTemplate.replace(/\#ID\#/g, this._fileId.toString().trim());
        return template;
    }

    public createCoverageComponent() {
        // //Write this out via program
        // let targetPath = path.resolve(this._program.options.rootDir);
        // let file = new File(path.resolve(path.join(targetPath), 'components'), 'components', 'CodeCoverage.xml', '.xml');
        // file.setFileContents(this._coverageComponentXmlTemplate);
        //`Writing to ${file.fullPath}`);
        // file.saveFileContents();

        // file = new File(path.resolve(path.join(targetPath, 'components')), 'components', 'CodeCoverage.brs', '.brs');
        // let template = this._coverageComponentBrsTemplate;
        // template = template.replace(/\#EXPECTED_MAP\#/g, JSON.stringify(this._expectedCoverageMap));
        // template = template.replace(/\#FILE_PATH_MAP\#/g, JSON.stringify(this._filePathMap));
        // file.setFileContents(template);
        //`Writing to ${file.fullPath}`);
        // file.saveFileContents();
    }

    public createCoverageSupport() {
        // //write this out via program
        // let targetPath = path.resolve(this._program.options.rootDir);
        // let file = new File(path.resolve(path.join(targetPath), 'source'), 'source', 'CodeCoverageSupport.brs', '.brs');
        // file.setFileContents(this._coverageSupportTemplate);
        //`Writing to ${file.fullPath}`);
        // file.saveFileContents();
    }
}
