import type { AnnotationExpression, BrsFile, Statement } from 'brighterscript';
import { diagnosticIllegalParams, diagnosticNoTestNameDefined, diagnosticMultipleDescribeAnnotations, diagnosticMultipleTestOnFunctionDefined } from '../utils/Diagnostics';

export enum AnnotationType {
    None = 'none',
    TestSuite = 'suite',
    Describe = 'describe',
    It = 'it',
    Ignore = 'ignore',
    Solo = 'only',
    NodeTest = 'sgnode',
    Setup = 'setup',
    TearDown = 'teardown',
    BeforeEach = 'beforeeach',
    AfterEach = 'aftereach',
    Params = 'params',
    IgnoreParams = 'ignoreparams',
    SoloParams = 'onlyparams',
    Async = 'async',
    Tags = 'tags',
    NoCatch = 'nocatch',
    NoEarlyExit = 'noearlyexit'
}

let annotationLookup = {
    suite: AnnotationType.TestSuite,
    describe: AnnotationType.Describe,
    it: AnnotationType.It,
    ignore: AnnotationType.Ignore,
    only: AnnotationType.Solo,
    sgnode: AnnotationType.NodeTest,
    setup: AnnotationType.Setup,
    teardown: AnnotationType.TearDown,
    beforeeach: AnnotationType.BeforeEach,
    aftereach: AnnotationType.AfterEach,
    params: AnnotationType.Params,
    ignoreparams: AnnotationType.IgnoreParams,
    onlyparams: AnnotationType.SoloParams,
    async: AnnotationType.Async,
    tags: AnnotationType.Tags,
    nocatch: AnnotationType.NoCatch,
    noearlyexit: AnnotationType.NoEarlyExit
};

interface ParsedComment {
    blockAnnotation?: RooibosAnnotation;
    testAnnotation?: RooibosAnnotation;
}

export class AnnotationParams {

    constructor(
        public annotation: AnnotationExpression,
        public text: string,
        public lineNumber: number,
        public params: any[],
        public isIgnore = false,
        public isSolo = false,
        public noCatch = false,
        public noEarlyexit = false
    ) {

    }
}
export class RooibosAnnotation {
    isAsync: boolean;
    asyncTimeout: number;

    /**
     * Represents a group of comments which contain tags such as @only, @suite, @describe, @it etc
     * @param statement block of comments that contain annotations to apply to the next statement
     */
    constructor(
        public file: BrsFile,
        public annotation: AnnotationExpression,
        public annotationType: AnnotationType,
        public text: string,
        public name: string,
        public isIgnore = false,
        public isSolo = false,
        public params: AnnotationParams[] = [],
        public nodeName?: string,
        rawTags: string[] = [],
        public noCatch = false,
        public noEarlyExit = false
    ) {
        this.tags = new Set<string>(rawTags);
    }
    public tags;
    public hasSoloParams = false;

    public static getAnnotation(file: BrsFile, statement: Statement): ParsedComment | null {

        //split annotations in case they include an it group..
        let blockAnnotation: RooibosAnnotation;
        let testAnnotation: RooibosAnnotation;
        let isSolo = false;
        let async = false;
        let isIgnore = false;
        let noCatch = false;
        let noEarlyExit = false;
        let nodeName = null;
        let asyncTimeout = -1;
        let tags = [] as string[];
        if (statement.annotations?.length) {
            let describeAnnotations = statement.annotations.filter((a) => getAnnotationType(a.name) === AnnotationType.Describe);
            if (describeAnnotations.length > 1) {
                for (let a of describeAnnotations) {
                    diagnosticMultipleDescribeAnnotations(file, a);
                }
            }

            // Break up the annotations grouped by Describes
            let blocks: AnnotationExpression[][] = [];
            let currentBlock: AnnotationExpression[] = [];
            for (const annotation of statement.annotations) {
                currentBlock.push(annotation);
                if (getAnnotationType(annotation.name) === AnnotationType.Describe) {
                    blocks.push(currentBlock);
                    currentBlock = [];
                }
            }
            // Make sure to push the last block as the last annotation likely wasn't a Describe
            if (blocks[blocks.length - 1] !== currentBlock) {
                blocks.push(currentBlock);
            }

            for (const annotationBlock of blocks) {
                // eslint-disable-next-line no-inner-declarations
                function getAnnotationsOfType(...names: string[]) {
                    return annotationBlock.filter(a => names.includes(a.name.toLowerCase()));
                }

                noEarlyExit = getAnnotationsOfType(AnnotationType.NoEarlyExit).length > 0;
                noCatch = getAnnotationsOfType(AnnotationType.NoCatch).length > 0;
                isSolo = getAnnotationsOfType(AnnotationType.Solo).length > 0;
                isIgnore = getAnnotationsOfType(AnnotationType.Ignore).length > 0;

                for (const annotation of getAnnotationsOfType(AnnotationType.Async)) {
                    async = true;
                    asyncTimeout = annotation.getArguments().length === 1 ? parseInt(annotation.getArguments()[0] as any) : -1;
                }

                for (const annotation of getAnnotationsOfType(AnnotationType.NodeTest)) {
                    nodeName = annotation.getArguments()[0] as string;
                }

                for (const annotation of getAnnotationsOfType(AnnotationType.Tags)) {
                    tags = annotation.getArguments().map((a) => a?.toString());
                }


                for (const annotation of getAnnotationsOfType(AnnotationType.BeforeEach, AnnotationType.AfterEach, AnnotationType.Setup, AnnotationType.TearDown)) {
                    testAnnotation = new RooibosAnnotation(file, annotation, getAnnotationType(annotation.name), annotation.name, annotation.name);
                }

                for (const annotation of getAnnotationsOfType(AnnotationType.Describe, AnnotationType.TestSuite)) {
                    const groupName = annotation.getArguments()[0] as string;
                    blockAnnotation = new RooibosAnnotation(file, annotation, getAnnotationType(annotation.name), annotation.name, groupName, isIgnore, isSolo, null, nodeName, tags, noCatch, noEarlyExit);
                    blockAnnotation.isAsync = async;
                    blockAnnotation.asyncTimeout = asyncTimeout === -1 ? 60000 : asyncTimeout;
                    nodeName = null;
                    isSolo = false;
                    isIgnore = false;
                    async = false;
                    asyncTimeout = -1;
                }

                for (const annotation of getAnnotationsOfType(AnnotationType.It)) {
                    const testName = annotation.getArguments()[0] as string;
                    if (!testName || testName.trim() === '') {
                        diagnosticNoTestNameDefined(file, annotation);
                    }
                    let newAnnotation = new RooibosAnnotation(file, annotation, getAnnotationType(annotation.name), annotation.name, testName, isIgnore, isSolo, undefined, undefined, tags, noCatch);
                    newAnnotation.isAsync = async;
                    newAnnotation.asyncTimeout = asyncTimeout === -1 ? 2000 : asyncTimeout;
                    if (testAnnotation) {
                        diagnosticMultipleTestOnFunctionDefined(file, newAnnotation.annotation);
                    } else {
                        testAnnotation = newAnnotation;
                    }
                    isSolo = false;
                    isIgnore = false;
                    async = false;
                    asyncTimeout = -1;
                }

                for (const annotation of getAnnotationsOfType(AnnotationType.Params, AnnotationType.SoloParams, AnnotationType.IgnoreParams)) {
                    if (testAnnotation) {
                        testAnnotation.parseParams(file, annotation, getAnnotationType(annotation.name), noCatch);
                    } else {
                        //error
                    }
                }
            }
        }
        return { blockAnnotation: blockAnnotation, testAnnotation: testAnnotation };
    }

    public parseParams(file: BrsFile, annotation: AnnotationExpression, annotationType: AnnotationType, noCatch: boolean) {
        let rawParams = JSON.stringify(annotation.getArguments());
        let isSolo = annotationType === AnnotationType.SoloParams;
        let isIgnore = annotationType === AnnotationType.IgnoreParams;
        if (isSolo) {
            this.hasSoloParams = true;
        }
        try {
            if (rawParams) {
                this.params.push(new AnnotationParams(annotation, rawParams, annotation.range.start.line, annotation.getArguments() as any, isIgnore, isSolo, noCatch));
            } else {
                diagnosticIllegalParams(file, annotation);
            }
        } catch (e) {
            diagnosticIllegalParams(file, annotation);
        }
    }

}

export function getAnnotationType(text: string): AnnotationType {
    return annotationLookup[text.toLowerCase()] || AnnotationType.None;
}
