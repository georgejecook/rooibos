<p align="center">
  <img src="../images/logo.png" alt="Rooibos test framework" width="200" height="200"/>
</p>
<h3 align="center">
Simple, mocha-inspired, flexible, fun Brightscript test framework for ROKU apps
</h3>


## FEATURES
 - [Easy to integrate](#easy-to-integrate)
 - [Simple, annotation-based, syntax for writing tests](#simple-syntax-for-writing-tests)
 - [No need for special file names, or method names](#no-need-for-special-file-or-method-names)
 - [Common TDD methods such as Setup/TearDown/BeforeEach/AfterEach](#common-tdd-methods)
 - [Organize tests by suites, groups and cases](#organize-tests-by-suites-groups-and-cases)
 - [Readable test output](#readable-test-output)
 - [Easily control test execution](#easily-control-test-execution)
 - [Simple assert syntax](#simple-assert-syntax)
 - [Node specific assertions](#node-specific-assertions)
 - [Parameterized testing](#parameterized-testing)
 - [Mocks and stubs](#mocks-and-stubs)
 - [Execute tests on scenegraph nodes](#execute-tests-on-scenegraph-nodes)
 - [Incorporate your own util methods](#incorporate-your-own-util-methods)
 - [Hook into your global setup mechanisms](#hook-into-your-global-setup-mechanisms)
 - [Only show output for failed tests](#only-show-output-for-failed-tests)
 - [Easily integrate into any CI system](#easily-integrate-into-any-ci-system)
 - [Generate code coverage](#generate-code-coverage)


## TABLE OF CONTENTS
 - [Getting started](#getting-started)
 - [Creating test suites](#creating-test-suites)
 - [Writing tests](#writing-tests)
 - [Understanding test output](#understanding-test-output)
 - [Controlling which tests run](#controlling-which-tests-run)
 - [Integrating with your app setup and util methods](#integrating-with-your-app-and-utils)
 - [Using mocks and stubs](#using-mocks-and-stubs)
 - [API reference](https://georgejecook.github.io/rooibos)
 - [Assertion reference](https://georgejecook.github.io/rooibos/module-BaseTestSuite.html)
 - [Integrating with your CI](#integrating-with-your-ci)
 - [Advanced Setup](#advanced-setup)
 - [Code coverage](#generate-code-coverage)

## Getting started
Rooibos is intentionally simple to work with. Simply install the `rooibos-cli` npm package and use that to install the framework files, and run your tests.

You can even use `rooibos-cli` from your npm-compatible build tools, such as gulp.


### Installation
<a name="easy-to-integrate"></a>

1. Either:
   - use the `rooibos-cli` tool (preferred way)

   ```
   npm install rooibos-cli -g
   rooibos-cli i myProject/source/tests
   ```
   
	- download the [latest relases's] (https://github.com/georgejecook/rooibos/releases/latest) `rooibosDist.brs` to a location in your `source` folder. The suggested folder structure to keep things clear is `source/tests/rooibos`.  
	- clone or download this repo and copy `dist/rooibosDist.brs` to a location in your `source` folder. The suggested folder structure to keep things clear is `source/tests/rooibos`.  
	
3. Add the following line to your main method, in your `main.brs` file It should be placed before you initialize your scenegraph screens

**(.brs)**
	
```
  'bs:disable-next-line
  if (type(Rooibos_init) = "Function") then Rooibos_init()
```

**(.bs)**
```
  'bs:disable-next-line
  if (type(Rooibos.init) = "Function") then Rooibos.init()
```
	
	Note - rooibos will run if it is present. *You should be filtering out your tests folder, containing rooibosDist.brs, and your tests as part of your non-test build/release process*, which is the preferred mechanism to disable/enable rooibos.
	
4. Create a Scene named `TestsScene.xml`, in your `components` folder. Again, we'd suggest following an easy to understand structure like `components/test/rooibos`. Rooibos will use this when running tests. This Scene must have a function definition for the `Rooibos_CreateTestNode` method, and include the rooibos library (which mixes in the method body for `Rooibos_CreateTestNode`.
5. Create a folder for your test specs. We'd suggest `source/tests/specs` to keep things simple. Write your `.brs` test files here.  
	If you are testing RSG components you will also need to create a folder to hold the test components, such as `components/tests/specs`.

	__See the example app to get a clearer understanding of the directory structures__ [Example app](../samples/example)
	<br>
6. Integrate [rooibos-cli](#rooibos-cli) into your tool-chain.
7. Run your tests


#### Delaying start so you can set things up

If you need to do some setup, like load some data from a service, before starting your tests:

 - add a field `isReadyToStartTests` to your tests scene
 - set the value to true, when the tests are ready to start.
 
**For an example of how to use rooibos with gulp, see the gulpfile.ts in this project, which is used to run the framework unit tests.**

### rooibos-cli

To get the best performance and test flexibility, rooibos leverages a typescript preprocessor, named [rooibos-cli](https://github.com/georgejecook/rooibosPreprocessor), which prepares some files which get sideloaded with your tests. 

### From javascript/typescript/node

#### Gulp typescript example

See `gulpfile.ts`, in this project, for a robust typescript-based gulp example demonstrating how to seamlessly integrate rooibos with gulp. However, the process is as follows:

 - `npm install rooibos-cli --save-dev`
 - Add the following to the top of gulpfile.ts/js `import { RooibosProcessor, createProcessorConfig, ProcessorConfig } from 'rooibos-cli';`
 - Create a task to process your test files, such as:

 ```
export async function prepareTests() {
  await rokuDeploy.prepublishToStaging(args);
  let config = createProcessorConfig({
	"projectPath": "build"
	"testsFilePattern": [
		"**/tests/**/*.brs",
		"!**/rooibosDist.brs",
		"!**/rooibosFunctionMap.brs",
		"!**/TestsScene.brs"
	]
});
  let processor = new RooibosProcessor(config);
  await processor.processFiles();
}
```

#### Gulp javascript example

For those who are not using typescript, the usage is as follows:

```
var rooibos = require('rooibos-cli');


gulp.task('prepareTests', ['collect'], async function() {
  let config = rooibos.createProcessorConfig({
  "projectPath": "build/test",
  "testsFilePattern": [
      "**/tests/**/*.brs",
      "!**/rooibosDist.brs",
      "!**/rooibosFunctionMap.brs",
      "!**/TestsScene.brs"
  ]
  });
  let processor = new rooibos.RooibosProcessor(config);
  await processor.processFiles();
});

```

#### Installing or updating the testing framework with rooibos-cli

To install latest

	```
	rooibos-cli i myProject/source/tests
	```

To install a specific release

	```
	rooibos-cli i myProject/source/tests -r 3.0.2
	```


#### Running tests with rooibos-cli

You can also use rooibos-cli from the command line, by installing it globally. i.e `npm install -g rooibos-cli`. The CLI app is vcalled `rooibos-cli`

Then call `rooibos-cli -h` to check the install worked and see the help menu.

There are two ways to invoke rooibos-cli:

1. Define a config file that returns a JSON object and tell rooibos-cli to use that via the `-c` flag:

	```
	rooibos-cli r path/to/config.json
	```

	_To see an example config file take a look at the [Example app](../samples/example)_
	<br>

2. Alternately, use the following flags to configure test behaviour, like so:

	```
	rooibos-cli r -p ./ -t source/tests
	```
	
### Description of rooibos-cli commands



| flag | argument                    | Fescription                                                                                                                                                                    |
|------|-----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `-p` | `--projectPath`             | the path to the root of your project. This is used to fix the `pkg:/locations` in rooibos's output.                                                                            |
| `-t` | `--testsFilePattern`        | array of globs, specifying which test files (i.e. your test _.brs_ files) to include. Relative to projectPath, relative to _"projectPath"_                                     |
| `-o` | `--outputPath`              | you can also specity the _"outputPath"_. This is where rooibos-cli will write the map file, and other files it needs which informs rooibos about your tests. It is relative to |
| `-v` | `--isRecordingCodeCoverage` | indicates that we want to generate coverage                                                                                                                                    |
| `-s` | `--sourceFilePattern`       | array of globs, specifying which files to include/exclude in code coverage. Relative to projectPath. Required if `-v` is set.                                                  |
| `-f` | `--showFailuresOnly`        | Show results for failed tests, if any. If none fail, then all results are shown                                                                                                |
| `-F` | `--failFast`                | Test execution will stop at the first failure                                                                                                                                  |
| `-l` | `--legacySupport`           | Flag indicating that rooibos should try to inlcude legacy roku unit tests                                                                                                      |
| `-l` | `--printLCov`           | Flag indicating that rooibos should wil print lcov results to the log, so you can populate your lcov file with them|

### Configuring Rooibos's runtime behaviour

Rooibos's configuration is controlled via the configuration passed into the `rooibos-cli` via flags on the `rooibos-cli` command, or values in the json used to initialize `rooibos-cli` via the command line, or via javacript code.


_Deprecation warning: This behaviour is going to change - in future, these json settings will be merged with the preprocessor config._

## Creating test suites
<a name="organize-tests-by-suites-groups-and-cases"></a>

Rooibos has a hiearchy of tests as follows:

 - TestSuite
	 - It Group
		 - TestCase
			 - Parameterized TestCase


A file is considered a test suite if it contains a `@TestSuite` annotation. No special naming is required. <a name="no-need-for-special-file-or-method-names"></a>


### Simple example
The following is a minimum working example of a Rooibos TestSuite, named `Simple.brs`
<a name="simple-syntax-for-writing-tests"></a>

```
'@TestSuite [Simp] Simple Tests

'@Setup
function Simp_SetUp() as void
    m.modelLocator = m.testUtils.GetStubModelLocator()
    m.vm = BVM_CreateVM("testVM", m.modelLocator)
end function

'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
'@It tests initializaiton of vm
'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

'@Test can instantiate with invalid modelLocator
function Simp_Init_invalid() as void
    m.vm = BVM_CreateVM("testVM", invalid)
    m.AssertNotInvalid(m.vm)
end function
```

#### Simple example Notes

1. The `++++++++++++`'s around the `@It` declaration are not required; but I find it makes the file much easier to read, and recommend it (or something similar, such as `'*****` as a best practice.
2. In the above example, `Simp` is the namespace, used to stop collisions between our tests and/or other source files


This results in the following test output:

![Simple test output](images/simpleReportOutput.png)

Note the hierarchical display of the Testsuite _[Simp] Simple Tests_, the group _tests initialization of vm_ and the test itself _can instantiate with invalid modelLocator_.

### Rooibos annotations
<a name="simple-syntax-for-writing-tests"></a>

Rooibos provides a library of annotations which can be used to define TestSuites, It groups, Test Cases, Parameterized tests, and more. All annotations are of the following form

```
'@ANNOTATION DATA
```

Where `ANNOTATION`, is the roku annotation and DATA is the data passed to it. e.g. `'@Test that it handles an empty collection`, defines a test case, with the title `that it handles an empty collection`

Some annotations act as modifiers. In these cases, they will affect some other annotation. For example `@Only`, and `@Ignore` will affect the following `@TestSuite`, `@It` or `@Test` annotation.

The following annotations are supported.

| Annotation                  | Description                                                                                                                                                                                                                                                                                                     | Data                                                                                              |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| @TestSuite                  | Indicates a file is a test suite                                                                                                                                                                                                                                                                                | Name of the test suite. Used in test output                                                       |
| @Setup                      | Run once when the suite, or it group is executed <a name="common-tdd-methods"></a>                                                                                                                                                                                                                                           |                                                                                                   |
| @TearDown                   | Run once when the suite or it group is finished                                                                                                                                                                                                                                                                             |                                                                                                   |
| @BeforeEach                 | Run before each test. Can be specified for the `@TestSuite`, or for each `@It` group                                                                                                                                                                                                                            |                                                                                                   |
| @AfterEach                  | Run after each test. Can be specified for the `@TestSuite`, or for each `@It` group                                                                                                                                                                                                                             |                                                                                                   |
| @It                         | Indicates a group of tests. Groupings improve readability. A group might denote various tests for a given method, or even an aspect of functionality                                                                                                                                                            | Name of the it group, which is used in the test output                                            |
| @Test                       | Indicates a `TestCase`. Must directly precede a function definition                                                                                                                                                                                                                                             | The name of the test acse, which will be reported in the test output                              |
| @Only                       | Precedes a TestSuite, It group, or TestCase, to indicate that _only that item_ should be executed. This can be used to rapidly filter out tests. Only other `@Only` items will be run.                                                                                                                          |                                                                                                   |
| @Ignore                     | Preceds a TestSuite, It group or TestCase, to indicate that that item should be ignored. If an `@Ignore` tag is found before an item, then it will not be executed as part of the test run                                                                                                                      |                                                                                                   |
| @Params[p1,p2,...,p6]       | Indicates a Paremeterized test. Must come _after_ a `@Test` annotation. Can accept up to 6 arguments, which are comma separated. When using paremeterized tests, the test function signature _must_ accept the same number of arguments, and each of Params statemens, must also have the same number of params | Up to 6 arguments can be any valid brightscript code, which can be parsed with an `eval` function |
| @IgnoreParams[p1,p2,...,p6] | A Convenience tag, which makes it easy to temporarily _comment out_ params tests we do not want to run.                                                                                                                                                                                                         | As per `@Params`                                                                                  |
| @OnlyParams[p1,p2,...,p6]   | A Convenience tag, which makes it easy to temporarily _solor_ params, so you can run one or more of the params in a params block. Very useful for focusing on a failing test case                                                                                                                               | As per `@Params`                                                                                  |


## Writing tests
Rooibos tests must be placed within a group, which in turn must be placed inside a TestSuite.

Tests then comprise assertions, which can test if values are equal, like (using fuzzy logic), contain values, etc.

<a name="simple-assert-syntax"></a>
An assertion looks like this:

```
m.AssertTrue(myValue)
```

A (contrived) test, might look like this:

```
'@Test can instantiate with invalid modelLocator
function Simpl_Basic_true() as void
    myValue = false
    m.AssertTrue(myValue)
end function
```

In this case, the test will fail

![Simple test output](images/simpleFail.png)

Observe how the test output indicates in which file the test suite resides, and the line of the failed assert, plus the reason for the failure. If your IDE has integrated brightscript support, such as eclipse, you will find that the locations are clickable. In this example, clicking on the Location link will navigate the IDE to the exact line of code of the assertion.

### Async tests

Rooibos runs in sync mode. Due to scenegraph limitations, we can't use observefield. We can workaround this though, using `AssertAsyncField`

This assert allows you to wait on a field set on a task, or some other async manipulated object. Use as such:

```
  netTask = createObject("roSGNode", "NetworkTask")
  m.AssertAsyncField(netTask, "output")
```

the framework will then check if the output field has changed, every 500 ms for 10 tries

You can control the timeout behaviour by passing delay and maxAttempts, as follows:

```
  '2 second time out, 3 tries
  netTask = createObject("roSGNode", "NetworkTask", 2000, 3)
  m.AssertAsyncField(netTask, "output")
```

If the field does not change during the retry period, the assertion will fail.

### Laying out tests
I suggest the following layout when writing your tests

```
'@Test that the correct index is found
function Simpl_DataStore_index() as void
	'1. setup your test data objects and values
	values = [{index:1,name:"one"},{index:4, name:"four"},{index:12, name:"twelve"}]
	ds = CreateDataStore(values)

	'2. Execute the method you wish to test
	item = ds.GetDataItemWithIndex(55)

	'3. Do your assertions
	m.AssertNotInvald(item)
	m.AssertEqual(item.name,"twelve")
end function
```

So the final test would look like:

```
'@Test that the correct index is found
function Simpl_DataStore_index() as void
	values = [{index:1,name:"one"},{index:4, name:"four"},{index:12, name:"twelve"}]
	ds = CreateDataStore(values)

	item = ds.GetDataItemWithIndex(12)

	m.AssertNotInvald(item)
	m.AssertEqual(item.name,"twelve")
end function
```

### More Assertions
The previous example can be written more succinctly using Rooibos's library of assertions

```
'@Test that the correct index is found
function Simpl_DataStore_index() as void
	values = [{index:1,name:"one"},{index:4, name:"four"},{index:12, name:"twelve"}]
	ds = CreateDataStore(values)

	item = ds.GetDataItemWithIndex(12)

	m.AssertAAContainsSubset(item, values[2])
end function
```


### Setting up and tearing down
You may find that you have data which is common to all of your tests in a suite. In this case you can desginate functions to run, before and after **all** tests are executed in your suite. To achieve this, simply add a `'@Setup` or `'@TearDown` annotation before the appropriate method. In our example above, we could do the following:

```
'@Setup
function Simpl_Setup() as void
	m.values = [{index:1,name:"one"},{index:4, name:"four"},{index:12, name:"twelve"}]
	m.ds = CreateDataStore(m.values)
end function

'@Test that the correct index is found
function Simpl_DataStore_index() as void
	item = m.ds.GetDataItemWithIndex(12)

	m.AssertAAContainsSubset(item, m.values[2])
end function
```

### Setup and TeardDown Scoping
Setup and Teardown, can also be scoped to an it group. If the annotations appear _after_ an `'@It` group annotation, then the setup and teardown will apply only to that group. If the annotations appear _before the first it group annotation_ then they will be applied to all groups, _which do not have Setup and Teardown group-level-annotations_


### Using BeforeEach and AfterEach
In addition, we can also use beforeEach and afterEach to run before **each and every** test.

```
'@Setup
function Simpl_Setup() as void
	m.values = [{index:1,name:"one"},{index:4, name:"four"},{index:12, name:"twelve"}]
	m.ds = CreateDataStore(m.values)
end function

'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
'@It tests alternate data
'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

'@BeforeEach
function MST_OnConfigLoaded_BeforeEach() as void
	m.alternateValues = [{index:2,name:"two"},{index:3, name:"three"},{index:20, name:"twenty"}]
	m.alternateDS = CreateDataStore(m.alternateValues)
end function

'@Test that the correct index is NOT found
function Simpl_Datastore_alternate_failures() as void
	item = m.alternateDS.GetDataItemWithIndex(12)

	m.AssertInvalid(item)
end function


'@Test that the correct index is found
function Simpl_Datastore_alternate_success() as void
	item = m.alternateDS.GetDataItemWithIndex(3)

	m.AssertAAContainsSubset(item, m.alternateValues[1])
end function

```

Note that in the example above, each of the tests in the `tests alternate data` group, can be run with different values; but we do not need to set the up in each test, or mutate the values used by other tests, which were defined in the `Setup` method.

#### BeforeEach and AfterEach Scoping
BeforeEach and AfterEach, can also be scoped to an it group. If the annotations appear _after_ an `'@It` group annotation, then they will only apply to that group. If the annotations appear _before the first it group annotation_ then they will be applied to all groups, _which do not have BeforeEach and AfterEach group-level-annotations_

### Paremeterized tests
<a name="parameterized-testing"></a>
Many times, we want to test a broad range of values. Writing identical tests with different values is tedious and unneccessary, using Rooibos's `'@Params` mechanism

You can run the same test several times, by adding one or more `'@Params[...]` annotations after the test annotation and before the method declaration, as follows:

```
'@Test AssertTrue
'@Params[true, true]
'@Params[false, false]
'@Params[invalid, false]
'@Params[0, false]
'@Params[1, false]
'@Params["test", false]
function Simp__basic_AssertTrue(value, expectedAssertResult) as void
...
```

In this case, the test will be run once for each of the `'@Params` annotations. Note that the method signature takes parameters which correspond to the arguments in the params arrays.

This makes it easy for us to pass in values to our tests, and expected output values, e.g.

```
'@Test schedule shows correct index for now
'@Params["04","10","15",0, 6]
'@Params["04","11","00",0, 7]
'@Params["05","15","20",1, 15]
'@Params["05","16","05",1, 17]
'@Params["05","18","00",1, 19]
function SUT__Update_realData_success(dayOfMonth, hour, minute, expectedDayIndex, expectedShowIndex) as void
	nowDate = SUT.CreateTestDate(dayOfMonth, hour, minute)

	m.scheduleContent.callFunc("UpdateTime", nowDate.asSeconds())
	m.AssertEqual(m.scheduleContent.nowDayIndex, expectedDayIndex)
	m.AssertEqual(m.scheduleContent.nowShowIndex, expectedShowIndex)
end function
```

Paremeterized tests accept any valid json. However, the number of top level items in the params array must match the amount of arguments for your test method. If they don't the TestCase will fail.

#### Advanced paramter directives

##### #RBSNode

You can instruct rooibos to create nodes as your parameter arguments. To do so, use the special value `"#RBSNode"`, which will create a ContentNode for that value. You can also specify the nod type you wish to create. See the following example for guidance:

```
'@Test
'@Params["#RBSNode", "ContentNode"]
'@Params["#RBSNode|Group", "Group"]
'@Params["#RBSNode|Label", "Label"]
function PT_RBSNodeDirective(node, expectedNodeType) as void
  m.assertSubType(node, expectedNodeType)
end function
```

#### Parameterized test output

The output from paremeterized tests shows the test name, and all of param configurations that were executed, making it easy to ascertain which param config results in a failure

![Simple test output](images/paramTest.png)

#### Ignoring parameterized test configs
If you have a couple of failing param tests, it can assist debugging to ignore the param configs you are not interested in. In this case, you can place the `'@Params` annotation with `'@IgnoreParams`, and that config will not execute.

Rooibos 0.2.0, will include an `@OnlyParams` annotation for further convenience.

#### Paremeterized tests and other annotations
If a test case has a `'@Only` or `'@Ignore` annotation, the _params_ will execute in accordance with their parent test case.

### Node specficic asserts
<a name="node-specific-assertions"></a>
Rooibos adds some node specifc asserts, which are fully described in the   [Assertion reference](https://georgejecook.github.io/rooibos/module-BaseTestSuite.html). These are:

 - AssertNodeCount
 - AssertNodeNotCount
 - AssertNodeEmpty
 - AssertNodeNotEmpty
 - AssertNodeContains
 - AssertNodeNotContains
 - AssertNodeContainsFields
 - AssertNodeNotContainsFields


### Full list of asserts
The full list of asserts can be found in the documentation  - [Assertion reference](https://georgejecook.github.io/rooibos/module-BaseTestSuite.html)

## Understanding test output
Rooibos reports test output in an easy to read hiearhchical manner.

<a name="readable-test-output"></a>
Each test suite has it's own tree structure in the output, and in turn has branches for each group, then each testcase that was run.

### Success and Failure output
When a test passes, it is indicated by the presence of `Success` at the end of the line

![Simple test output](images/simpleReportOutput.png)


When a test fails, it is indicated by a `-` in the trunk of the test output, and `Fail`, at the end of the line. In addition, failed tests contain a link to the line of the failed assertion, and the reason for the failure.

![Simple test output](images/simpleFail.png)

### End of test report

At the end of the test report, you will get a report telling you how many tests ran, failed, crashed, and the time spent.

In addition, you get a simple to parse result as the last line of output, which makes it easy for you to ascertain the result for your Continuous Integration process.

![Simple test output](images/endOfTest.png)

## Controlling which tests run
<a name="easily-control-test-execution"></a>
Rooibos is built to facilitate TDD, and other test-based developer workflows. For this reason, I made it _very easy_ to specify which tests run, so you can simply execute 1 or a few tests while developing, then more as you finish the method you are currently working with.

### Ignore annotation
If you place `'@Ignore` above a test suite, it group, or test case, it will ignore it. i.e. it will not be executed.

You can give a reason for ignoring a test, as part of the annotation's data. e.g.

```
'@Ignore DataStore is being refactored
'@Test that the correct index is NOT found
function Simpl_Datastore_alternate_failures() as void
	item = m.alternateDS.GetDataItemWithIndex(12)

	m.AssertInvalid(item)
end function
```

The log reporter will indicate which tests are ignored, if you have log verbosity set to 2 or greater

### Only annotation
If you place `'@Only` above a test suite, it group, or test case, it will run that test in solo mode. In solo mode, execution is limited to those suites, groups or test cases, which also have a `'@Only' annotation.

A good working practice is to put a `'@Only` annotaiton on the suite for the class you are working on, then the group, then the individual test. You can tehn simply remove the annotation from the test when you have finished, and run the tests again, to see if you caused regression in any of the group's tests, then remove from the group and run the suite, then finally remove the `'@Only` annotation from the suite. This will allow you to run the least amount of tests at any time, while you work, giving you the fastest testing turnaround time.


### Only show output for failures
<a name="only-show-output-for-failed-tests"></a>
In addition to the the `'@Only` and `'@Ignore` annotations, Rooibos has another mechanism for aiding the TDD process. You are able to execute Rooibos in `showOnblyFailures` mode. In this mode, all tests are executed (according to the `'@Only` and `'@Ignore` annotations); but if any failures are encountered, then only the failures are displayed. If all tests pass, then the stanard test output is shown.

This makes it easy to quickly dive into the test suite and see what regressions have been introduced, then you can simply navigate to the failed tests and annotate them with `'@Only` annotations (so that subsequent runs are much quicker)

This can be achieved by setting `showOnlyFailures` to true in the config, or, more conveniently, passing `showOnlyFailures=true` when launching the tests. An example make file target, might look like this:

```
testFailures:
	curl -d '' "http://${ROKU_DEV_TARGET}:8060/launch/dev?RunTests=true&showOnlyFailures=true&logLevel=4"
```

## Integrating with your app setup and util methods

### Hooking into your global setup
<a name="hook-into-your-global-setup-mechanisms"></a>
It is likely that your app will have some degree of setup (like loading config files, setting global properties, etc), that will be required to occur before starting your unit tests. You can have Rooibos invoke your setup methods, at the correct time during it's setup, by passing a function pointer into the `Rooibos__Init` method, as such:

```
if (type(Rooibos__Init) = "Function") then Rooibos__Init(SetupGlobals)

....

sub SetupGlobals()
'some setup stuff that is pertinent to your app and unit tests
end sub

```

### Adding your own util functions to the unit tests
<a name="incorporate-your-own-util-methods"></a>
If you wish, you can provide a third function pointer to the `Rooibos_Init` method, which will receive a _TestCase_ paremeter. You can decorate this TestCase with util methods you want to make accessible to your unit tests at runtime. e.g.


```
if (type(Rooibos__Init) = "Function") then Rooibos__Init(SetupGlobals, "DecorateTestUtils")

....

sub DecorateTestUtils(testCase)
	'add rodash
	testCase.r = rodash()
	'add some test utils specific to my project
	testCase.testUtils = TestUtils()
end sub

```

These utility objects/methods/values, will then be available when the test is executed. e.g.

```
'@Test DataReceived
function MyNS_DataReceived() as void
	'using rodash to get the data value for the insert
	m.AssertNotInvalid(m.r.get(result,"data.row[0]",invalid))
end function
```

Note: The test utils decorator and all of it's dependencies must be visible to the current exeucting test. That means if you have a node test you must include the script file containing the `testCase.testUtils` method, and all other methods it invokes. The sample app contains an example.

### Accessing global scope

Non-node tests should find all methods are automatically in scope; however, if you need to access the node scope to test anonymous, or mixin methods, this is also supported. You can make your global scope available by calling `Rooibos__Init` and passing in a reference to your scope, as such

```
sub Main(args as dynamic)
    if (type(Rooibos__Init) = "Function") then Rooibos__Init(SetupGlobals, "AddTestUtils", invalid, m)
end sub

```

You can then access a node scoped method (i.e. one that is not on m, or on any other object) in the following way:

```

'@Test 
function BT_globalScope() as void
  m.assertNotInvalid(m.node)
  BT_doSomethingInNodeScope(true)
  m.assertInvalid(m._isNodeScopeVarSet)
  m.assertTrue(m.node. _isNodeScopeVarSet)
end function

function BT_doSomethingInNodeScope(value)
  m._isNodeScopeVarSet = value
end function
```


## Using mocks and stubs
<a name="mocks-and-stubs"></a>
Rooibos can be used for integration, behaviour, unit testing, and TDD. In many cases (particularly TDD and unit testing), we will not want to execute all of the methods invoked by our code; but will instead prefer to mock and stub those method calls.

In other cases, it may simply be impractical to execute code as part of our tests. Examples can be executing method that make network calls, require hardware, or playback, or just simply take to long.

In all of these cases, you can use Rooibos's mocks and stubs in place of real method calls.

### Mocks, Stubs and Fakes

#### Fakes
Fakes are objects, which you can use in place of real methods. They are invoked, receive parameters, and can return values, just like real methods. As far as the invokee is concerned, it _is_ the real method you intended to be executed in your code. Fakes are what Rooibos uses under the hood, to facilitate it's Stub and Mock implementations.

#### Stubs
Stubs are Fakes which are not tracked. This means that you can execute your unit tests, using the fake methods; but Rooibos will not fail your tests if things were not as expected (i.e. wrong params, wrong number of invocations). These can be very handy for setting certain test conditions (i.e. you can create a fake network response that will return a speific result, which drives your test)

To create a stub, we use the `Stub` method:

```
function Stub(target, methodName, expectedInvocations = 1, expectedArgs = invalid, returnValue = invalid) as object
```

 - The target is the object which will have it's method replaced,
 - Method name is the name of the method to replace
 - expectedInvocations is the number of times we expect the method to be called
 - expectedArgs is an array of values we expect the method to be invoked with
 - returnValue is the value we wish to return

##### A simple example
Given a ViewModel, named DetailsVM, which has a method LoadDetails, as such:
```
function LoadDetails() as void
	isNetworkRequestExecuted = m.ExecuteNetRequest("http://my.data.com/get")
	m.isLoading = isNetworkRequestExecuted
	m.isShowingError = not isNetworkRequestExecuted
end function
```

We can use a stub, to facilitate testing against the network layer

```
detailsVM = CreateDetailsVM()
returnJson = {success:false}
m.Stub(detailsVM,"ExecuteNetRequest", invalid, returnJson)

detailsVM.LoadDetails()

m.AssertFalse(detailsVM.isLoading)
m.AssertTure(detailsVM.isShowingError)
```

In this case, our detailsVM object, will not actually call ExecuteNetRequests's source code; but will instead call a _fake_ (i.e fake method body), which can return predtermined values, or be later checked for invocation arg conformance.

#### Mocks
Mocks are _expected_ fakes. Your code will invoke the method, as if it _is_ the real method; but the difference is that Rooibos will track the invoction of mocks, and if the method was not invoked in the manner you expected (i.e. with the expected parameters and the expected number of invocations) then a unit test failure will result.

We create mocks by using the methods:

 - Expect - Creates a generic mock
 - ExpectOnce - Creates a mock, which we expect to be called once _or can created individual overloaded calls to the same method_
 - ExpectNone - Creates a mock, which we _never_ expect to be invoked

### Asserting mocks
Mocks are asserted by invoking `m.AssertMocks()`
***As a convenience, Rooibos will automatically assert any mocks for you when your test finishes executing***. This saves you from having to manually add this line at the end of your code.

When a mock fails, Rooibos will report to you what caused the failure. The possible reasons are:

 - The method was invoked by your code, with the wrong parameters
 - The method was invoked too many times by your code
 - The method was never invoked by your code; but it should've been

For example, the above test could be written with mocks as follows:

```
detailsVM = CreateDetailsVM()
returnJson = {success:false}
m.ExpectOnce(detailsVM,"ExecuteNetRequest", invalid, returnJson)

detailsVM.LoadDetails()

m.AssertFalse(detailsVM.isLoading)
m.AssertTure(detailsVM.isShowingError)
```

In addition to the other asserts, Rooibos will autoamtically check that ExecuteNetRequest was executed exactly once

#### Manually Checking mock invocations
If you wish you, you can store a reference to a mock or a stub, and later check the invocation values.

All mock and stub methods return a reference to the _Fake_ that it wired into your code. e.g.

```
executeMock = m.ExpectOnce(detailsVM,"ExecuteNetRequest", invalid, returnJson)

detailsVM.LoadDetails()

? exceuteMock.invokedArgs
? excecuteMock.invocations
```

#### Specifying expected invocation arguments
You can save yourself a lot of time, and really think about and kick the tyres of your code, by defining the arguments you expect a function to be invoked with. This is done by passing in an array of the expected invocation arguments via the expectedArgs param. You may also really not care about the args, in which case you can set that value to `invalid` and the call to `m.AssertMocks()` will skip checking the invoked args.

Up to 9 arguments are supported.

#### Expecting several calls to the same method, with verified invocation params

You may wish to call the same method various times, and return different values, or check different arguments were invoked

In this case, we use overloaded `expectOnce` calls, as per the following example:

```
  m.expectOnce(obj, "mockMethod", [arg1], result1, true)
  m.expectOnce(obj, "mockMethod", [arg2], result2, true)
  m.expectOnce(obj, "mockMethod", [arg3], result3, true)
```

This will now set the framework to expect 3 calls to mockMethod, the first with value of _arg1_, returning _result1_; the second with value of _arg2_, returning _result2_; and the last with value of _arg3_, returning _result3_


#### Specifying an expected value of invalid, with m.invalidValue

If you specify the invoked args, then by default, rooibos will check that the invoked args match the arguments you specify. You can expect any value for an arg, or use the special `m.invalidValue` to indicate you expect the argument to be invalid. This is the default value.

So for example, if one had the following mock

```m.expectOnce(myObj, "myMethod", ["a", "b"], true)```

and `myMethod` was invoked with `["a", "b", "c"]`, this would be a mock failure, because the 3rd argument was expected to be invalid, by default.

In that case, the following mock definition would satisfy the assertion:

```m.expectOnce(myObj, "myMethod", ["a", "b", "c"], true)```

#### Skipping value assertion with m.ignoreValue

If you only care about some arguments, then you can use `m.ignoreValue` to instruct rooibos to not assert equality for the arguments you've ignored.

In the above example, the assertion will be satisfied with a mock confiugred thusly:

```m.expectOnce(myObj, "myMethod", ["a", "b", m.ignoreValue], true)```

This will pass when `myMethod` is invoked with args: `["a", "b", "c"]`, as would the following mock definition:

```m.expectOnce(myObj, "myMethod", [m.ignoreValue, "b", "c"], true)```


#### Using matchers to assert mock invocation args

In addition to the other basic matchers described above, rooibos provides a set of pre-defined _any_ matchers, and a mechansim for you to provide custom matchers for any mock argument.

##### Built in matchers

Rooibos has matchers that will pass, if the values are of the specified _anyXXXMatcher_ type. For convenience, the matchers are stored on `m.anyXXXMatcher` on your test suite. The following are available.

 - anyBoolMatcher
 - anyNumberMatcher
 - anyStringMatcher
 - anyArrayMatcher
 - anyAAMatcher
 - anyNodeMatcher

Simply specify the matcher in your mock definition, as follows:

```m.expectOnce(myObj, "myMethod", [m.anyStringMatcher, m.anyBoolMatcher], true)```

In this case, the mock be satisfied if it was called with 2 params, the first one a string, the second a bool, both of any value.

##### Custom matchers.

It is simple to use a custom matcher to assert your mock arguments. Simply:

 - implement a function that takes one argument, and returns true or false
 - ensure it's in scope
 - return your function (either by pointer, or inline), in an aa as follow: `{"matcher": yourMatcherFunction}

For example, using a function pointer (.brs):

```
  m.expectOnce(m.myClass, "doWork", [{"matcher": Rooibos_Matcher_anyArray}], returnValue)
```

For example, using a function pointer (bs):

```
  m.expectOnce(m.myClass, "doWork", [{"matcher": Rooibos.Matcher.anyArray}], returnValue)
```

And inline:

```
  m.expectOnce(m.myClass, "doWork", [{ "matcher": function(value)
        return value = true
    end function }], returnValue)
```


#### returning values from your mocks
Simply set your return value to a non-invalid value, to specify a return value.
You can also specify multiple return values, if you expect your mock to be executed multiple times, and would like to use different values. In that case, return a pobo, with the special key : `multiResult`. The value will be returned for each invocation - if the mock is invoked more than the number of return values, the last one is reutrned. e.g.

```
  m.expect(obj, "mockMethod", 5, invalid, {"multiResult": ["one", 2, invalid, "last"]}, true)

  m.AssertEqual(obj.mockMethod(), "one")
  m.AssertEqual(obj.mockMethod(), 2)
  m.AssertEqual(obj.mockMethod(), invalid)
  m.AssertEqual(obj.mockMethod(), "last")
  m.AssertEqual(obj.mockMethod(), "last")

```


### Allowing mocking of non-existent functions
As a sanity check, rooibos will expect a method to exist on an object before allowing it to be stubbed or mocked. If it is not, it will fail log an error and lead to a failing mock assertion.

This behaviour can be disabled by passing in the last argument of the mock/stub/fake function (`allowNonExistingMethods`) as `true`. In this case, rooibos will still log a warning; but you will be allowed to create the fake method.

This is handy for quickly creating mock dependencies with simple _pobos_ (plain old brightscript objects). e.g.

```
videoService = {}
m.expectOnce (videoService, "getVideos", invalid, someJson, true)
```

Note, you can also opt to disable the error at the whole test suite level; by setting `m.allowNonExistingMethods = true` in your test suite code.


### Mock limitations
Please note, mocks DO NOT work with globally scoped methods (i.e. subs and functions which are not assigned to an associative array). E.g. if you have a method, which is not accessed via `m.SomeMethod`, or `someObject.SomeMethod`, then you cannot mock it. This is a long term limitation. If you are hitting this problem, I suggest it's likely a code-smell anyhow, and you might consider using a pattern such as MVVM, which will better allow you to separate view and business logic.

## Integrating with your CI
<a name="easily-integrate-into-any-ci-system"></a>
Rooibos does not have special test runners for outputting to files, or uploading to servers. However, that will not stop you integrating with your CI system.

Becuase the test output has a convenient status at the end of the output, you can simply parse the last line of output from the telnet session to ascertain if your CI build's test succeeded or failed.

Note that rooibos doesn't need any special paramters to run. If you follow the standard setup the tests will run. Simply ensure that your build system includes, or does not include rooibosDist.brs (and better still, _all_ of your tests), depending on whether you wish to run the tests or not.

An example make target might look like

```
#amount of time to wait for unit test execution
ROKU_TEST_WAIT_DURATION=5
ROKU_TEST_ID=[Some identifiter for your tests, should be set by CI as the buildid/git hash]

continuousIntegration: build install
	echo "Running Rooibos Unit Tests"
	curl -d '' "http://${ROKU_DEV_TARGET}:8060/keypress/home"
	curl -d '' "http://${ROKU_DEV_TARGET}:8060/launch/dev?"
	-sleep ${ROKU_TEST_WAIT_DURATION} | telnet ${ROKU_DEV_TARGET} 8085 | tee dist/test.log
	echo "=================== CI TESTS FINISHED =================== "

	if tail -2 dist/test.log | head | grep -q "RESULT: Success"; then echo "SUCCESS"; else exit -1; fi

```

In the above example, we pipe the output of the telnet session to `dist/test.log`, wait for the test execution to finish, and finally, parse the line of test output to check for the SUCCESS flag.

### Coming soon: Gulp example

The frameworkTests project is currently run using gulp with typescript. See `gulpfile.ts` for an example, until I get time to add specifics here.

## Advanced setup

### Advanced use of TestsScene.xml
To use Rooibos, you need to provide a scene (default name `TestsScene.xml`). This scene should be empty; but may well contain code in the init method to setup global values, which you need to execute your runtime code. Consider an application which uses `ModelLocator` pattern, or some other _IOC_ pattern. In this case it would make sense to initiate the pattern in the `TestsScene.xml`, rather than have to set it up in every single test `Setup`.

#### Example TestsScene.xml

```
<?xml version="1.0" encoding="UTF-8"?>
<component
	name="TestsScene"
	extends="Scene"
	xsi:noNamespaceSchemaLocation="https://devtools.web.roku.com/schema/RokuSceneGraph.xsd"
>
>  <interface>
    <function name="Rooibos_CreateTestNode" />
  </interface>

  <script type="text/brightscript" uri="TestsScene.brs" />

  <script type="text/brightscript" uri="pkg:/source/rooibosDist.brs" />
  
  <script type="text/brightscript" uri="pkg:/source/rooibosFunctionMap.brs" />
</component>
```

#### Example TestsScene.brs
```
sub Init()
	'Example of an application using ModelLocator pattern
	'many of the codefiles will expect to have access to a global ModelLocator
	'so setting it on the `TestsScene`, makes sense.

    m.global.addFields({"modelLocator": createObject("roSGNode", "ModelLocator")})
end sub
```

### Using a different TestsScene.xml
The scene name can be overriden by passing in the desired scene name as the third `Rooibos__Init` parameter. e.g.


```
if (type(Rooibos__Init) = "Function") then Rooibos__Init(args, SetupGlobals, "DecorateTestUtils", "MyOtherTestsScene")
```


### Make from source
You can rebuild by running the following command from the terminal:

```make dist```

Which will compress all of the source files in the `src` folder into `dist/rooibosDist.brs`, which can then be copied to your project

## Testing scenegraph nodes
<a name="execute-tests-on-scenegraph-nodes"></a>
I prefer to use [MVVM](https://medium.com/flawless-app-stories/how-to-use-a-model-view-viewmodel-architecture-for-ios-46963c67be1b) (link is for iOS pattern, so I don't personally run tests on my scene graph nodes (I have a preprocessor that does all the glueing for me, so I really have very little logic to test), however, I know not everyone works with that practice, so I went to considerable effort to make sure you can run unit tests on your scene graph nodes :)

### Steps to test scenegraph nodes
SceneGraph nodes are essentially _islands_ they cannot see any other code in your app, which is why they are not subject to name collisions. The only way to access methods in a node file, is to make an interface method and use `callFunc`. This is impractical for testing. We therefore need to create a _wrapper node_ which _extends_ the node we wish to test, and allows us to inject our tests into it.

It's a simple process; but I'm fully documenting it to facilitate a deep understanding. Once you do it once, you'll just be copy and pasting a node file, adding an annotation and changing a filename reference.

For now, here are the complete steps:

1. For each SceneGraph node you want to test, you need to create a corresponding xml file. Example
	- The name is not important; but I suggest `[NODE_NAME]TestProxy.xml`, so if you were testing `NetworkLayer.xml`, you would create a `NetworkLayerTestProxy.xml` file.
	- This file should be located somewhere in your `components` folder, placing it under `components/tests` is a good idea, as you can easily exclude it from production builds.
	- The file must extend the node you wish to test, e.g. `extends="NetworkLayer.xml"`
	- You must also include an interface function definition for a function named `Rooibos_RunNodeTests`. You _must not_ implement it, it is mixed in for you automatically.
	- You must import your unit test suite (e.g. `NetworkLayerTests.brs`) as well as the rooibos framework (i.e. `rooibosDist.brs`) and the rooibos map file generated by `rooibos-cli` (i.e. `rooibosFunctionMap.brs`)
2. In your unit test suite, before the ``@TestSuite` delcaration you _must_ place a `'@SGNode` Annotation, with the name of the node that will be used to test this suite. e.g. `'@SGNode NodeExampleTests.brs `

#### Example test suite: NetworkLayerTests.brs

```
'@SGNode NodeExampleTests
'@TestSuite [NET] Node Example Tests

'@Setup
function NET_setup() as void
    m.setupThing = "something created during setup"
end function

'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
'@It tests methods present on the node
'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

...
```


#### Example node test wrapper: NetworkLayerTestProxy.xml

This file is located in `components/tests`

```
<?xml version="1.0" encoding="UTF-8"?>
<component
	name="NetworkLayerTestProxy.xml"
	extends="NetworkLayer"
	xsi:noNamespaceSchemaLocation="https://devtools.web.roku.com/schema/RokuSceneGraph.xsd"
>
	<interface>
		<!-- public fields/functions -->
		<function name="Rooibos_RunNodeTests" />
	</interface>

	<script type="text/brightscript" uri="pkg:/source/tests/NodeExampleTests.brs" />

	<script type="text/brightscript" uri="pkg:/source/rooibosDist.brs" />

    <script type="text/brightscript" uri="pkg:/source/rooibosFunctionMap.brs" />
</component>
```

### Nuances of testing nodes
The behaviour of your unit tests is identical to unit testing any other class, with 2 caveates:

1. `m` does not refer to your node, it refers to the test suite, as per normal testing. The following variables are available to you in your test as a convenience:

  - `m.node` - codebehind for your xml file (e.g. your brs's m)
  - `m.top` the node you are testing
  - `m.global` access to the global node
2. You **cannot** stub node methods. If there is no `.` reference to a method (via an associated array style object), then Rooibos cannot mock it. You may consider refactoring your code in these cases, as imho, it's better practice for things that you want to mock, to not be in the glue code of your code behdind files, in any case
3. If you use mixins, which use eval to locate methods by name (common practice if you are doing anything complex) then be aware that the eval namespace is NOT the code in your unit test; but the code in your node's brs file and your test node's brs file. If you need to add more methods, such as callbck stubs, you can add them to the .brs file of your test.

## Working with tests
There are many articles on the benefits of TDD, and how to go about TDD, which you can readily find, such as [this link](https://builttoadapt.io/why-tdd-489fdcdda05e) which has a good overview, plus a great video with warnings of how to take it too far.

Personally, I get great mileage doing TDD in roku by using MVVM pattern (I'm soon to release a lightweight MVVM framework). You can get more info on that [here](https://medium.com/flawless-app-stories/how-to-use-a-model-view-viewmodel-architecture-for-ios-46963c67be1b) (for iOS), and ideas on how that benefits roku dev [here](https://medium.com/plexlabs/xml-code-good-times-rsg-application-b963f0cec01b)

I use these practices as much as possible becuase:

1. Keeps my view and business logic separated
2. Tests are super fast to run (I generally run about 400 or so in each of my projects in < 5 seconds, and when running 1 test, turn around time is < 3 seconds)
3. I can test all of my logic and ideas out in isolation, before I start up my app, navigate to the correct page
4. Easy to mock my code, so that I can test a broad range of network conditions
5. I get a Regression test suite as I write my code
6. It's really the quickest way to develop. In my 20+ years professional experience those who follow TDD (or some less-strict form of it) write far more, and far better code than their counterparts, and their projects end up being way more maintainable over the years.

Personally, I like to have my test in one window, the code I'm testing in another, and a third window with a telnet session, showing my testing output. This is especially handy, as Rooibos hyperlinks to the lines that assertions fail on, so I can easily navigate straight to the problematic tests.

E.g.

![Simple test output](images/TestingExample.png)

I slap an `@Only` annotation on the suite, group and test I'm currently working on, and have a hotkey to run my tests.

Once my test passes, I test for regression, then run the whole suite, then run the app and test out in the UI.

I also have templates for creating groups and test cases, which you are free to copy : they are for eclipse ide.

Configured as name `test`

```
'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
'@It tests ${itDescription}
'+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

'@Test ${testDescription}
function ${prefix}__${itDescription}_${testName}() as void
	m.AssertFail("implement me!")
	${cursor}
end function
```

Configured as name `it`

```
'@Test ${testDescription}
function ${prefix}__${testName}_${testCase}() as void
	m.AssertFail("implementMe")
	${cursor}
end function
```

## Backward compatibility

<a name="compatible-with-legacy-framework"></a>

Rooibos is backward compatible with the [legacy framework](https://github.com/rokudev/unit-testing-framework/), Use the `-l --legacySupport` flag with rooibos-cli to use this feature.

`'@Only`, `'@Ingore`, `'@Setup`, `'@TearDown` are all supported. Only and Ignore can be applied to a whole test suite, or individual test cases.

Your files required to follow the convention as laid out [here](https://github.com/rokudev/unit-testing-framework/blob/master/samples/SimpleTestApp/source/tests/Test__Main.brs) 


It is recommended that you upgrade your legacy tests to the new syntax for maximum flexibility, functionality and comfort.

## Generate code coverage

Rooibos can measure and report the test coverage your unit tests are producing.

### Code coverage recording is desctructive! 

#### WARNING - DO NOT run code coverage against your source folder!

Recording coverage means modifying your sources! you should only run the coverage on a project path pointing to a build folder _not_ your source. 

These files should be cleaned and recopied _every time you run coverage_ or you will get compile errors/other undetermined behaviour.

#### WARNING - Running code coverage is slower and may crash your device

Running a code coverage report is a lot slower than a standard test, due to conitnual probing of your source. Only run coverage when needed. Also - be aware it will crash very tight loops, like inside of a while waiting on a port, which will in fact crash and hard reset your device.

### Recording coverage
To record coverage, set the `sourceFilePattern` to a glob matching (including and excluding) the files that should be included in your coverage report, and set the `isRecordingCodeCoverage` flag to true. Be careful to not include your test specs!!

An example, using a json config file is :

```
{
	"projectPath": "build",
	"sourceFilePattern": [
		"**/*.brs",
		"**/*.xml",
		"!**/tests/**/*.*",
		"!**/tests",
		"!**/rLog",
		"!**/rLog/**/*.*",
		"!**/rLogComponents",
		"!**/rLogComponents/**/*.*",
		"!**/rooibosDist.brs",
		"!**/rooibosFunctionMap.brs",
		"!**/TestsScene.brs",
		"!**/ThreadUtils.brs"
	],
	"testsFilePattern": [
		"**/tests/**/*.brs",
		"!**/rooibosDist.brs",
		"!**/rooibosFunctionMap.brs",
		"!**/TestsScene.brs"
	],
	"isRecordingCodeCoverage": true
}
```

This can be done, from the command line also, with the following command:

```rooibos-cli -p stubProject -t source/tests/**/*.brs -v -s '**/*.brs,**/*.xml,!**/tests/**/*.*,!**/tests,!**/rLog,!**/rLog/**/*.*,!**/rLogComponents,!**/rLogComponents/**/*.*,!**/rooibosDist.brs,!**/rooibosFunctionMap.brs,!**/TestsScene.brs,!**/ThreadaUtils.brs'```

### How coverage works

rooibos-cli, via `rooibos-cli` command line tool, or the npm package will run against a root project folder, and using the `sourceFilePattern` globs your provide, will ascertain which files require coverage.

It then buils an Abstract Syntax Tree, using Sean Barag's wonderful [brs interpreter](https://github.com/sjbarag/brs), to ascertain which lines of the identified files can have their coverage tracked.

The preprocessor then injects function calls for all trackable lines, which update tracking variables at runtime.

Rooibos framework will then collate the stats and display them at the end of the run.

#### Statement support

The following statements types are supported:

  - variable assignments
  - method calls
  - nested function definitions (i.e. functions inside of arrays, variable assignments, method call args, or associative arrays)
  - if statement conditions
  - blocks of code in if, else if, and else statements
  - for and while loops
  - print statements

The following statements are _not_ supported

  - goto
  - named lines (e.g. `myGotoLine:`)
  - else if conditions (these are coming real soon though)

### Coverage report

When your coverage test run finishes rooibos will print out:

```
+++++++++++++++++++++++++++++++++++++++++++
Code Coverage Report
+++++++++++++++++++++++++++++++++++++++++++

Total Coverage: 5.066445% (610/12040)
Files:  17/ 100

HIT FILES
---------
pkg:/components/ContentRetriever/ContentRetriever.brs: 2.461539% (8/325)
pkg:/components/Analytics/AnalyticsManager.brs: 3.125% (6/192)
pkg:/components/Service/AuthenticationService.brs: 3.532609% (13/368)
pkg:/components/Container/UserContainer/UserContainer.brs: 3.703704% (1/27)
pkg:/components/MaintenanceCheckTask/AppConfigurationTask.brs: 7.407407% (2/27)
pkg:/components/Storage/PersistentStorage.brs: 15.27778% (11/72)
pkg:/source/Analytics/AnalyticsVideoMixin.brs: 16.92308% (22/130)
pkg:/components/DeveloperService/DeveloperService.brs: 33.33334% (2/6)
pkg:/components/Log/Log.brs: 45% (9/20)
pkg:/source/Modules/BaseModule.brs: 55.55556% (5/9)
pkg:/source/Log.brs: 65% (13/20)
pkg:/source/Modules/DeepLinkingModule.brs: 76.92308% (50/65)
pkg:/components/GlobalInitializer/GlobalInitializer.brs: 79.64601% (90/113)
pkg:/source/Modules/RecommendationModule.brs: 84.9315% (186/219)
pkg:/source/Mixins/ParsingMixin.brs: 86.47343% (179/207)
pkg:/source/Mixins/SMCErrors.brs: 92.30769% (12/13)
pkg:/source/Analytics/AnalyticsConstants.brs: 100% (1/1)

MISSED FILES
------------
pkg:/components/CustomRowListItem/CustomItemGenres/CustomItemGenres.brs: MISS!
pkg:/components/StringUtils.brs: MISS!
pkg:/components/Core/Components/TabComponent/TabComponent.brs: MISS!
pkg:/components/Core/Components/NoKeyPressRowList.brs: MISS!
pkg:/components/Model/TabComponentContent.brs: MISS!
```

e.g.

![coverage output](images/coverage.png)


  - Total coverage - % (num of hit lines/ num of trackable lines)
  - Files: num of hit files / total num of trackable files

Following is a list of all the hit files, and their coverage % and (hit lines/total lines)

Lastly the files that were not hit at all, during test execution.

The current implementation is capable of tracking lcov style statistics; to do this, run rooibos-cli with the arg `--printLcov` or add `"printLcov": true` to your gulp build.

In this case the lcov report is printed to the end of the console output. Thanks very much to @Ronen on the slack channel for this contribution!

The report is contained after the LCOV.INFO file. Given that that the console output could be saved, it should be trivial to watch the log output file, and update your lcov file after running your tests.

e.g.

![coverage output](images/lcov.png)

