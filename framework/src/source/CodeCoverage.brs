function init()
  m.coverageMap = "#BASE_COVERAGE_REPORT#"
  m.port = createObject("roMessagePort")
  m.top.observeFieldScoped("entry", m.port)
  m.top.functionName = "runTaskThread"
  m.top.control = "RUN"
end function

function runTaskThread() as void
  while true
    events = []
    saving = false
    message = getMessage(m.port)
    if message <> invalid
      events.push(message)
    end if
    if m.top.save = true
      saving = true
      ? "Saving unprocessed code cov events..."
      'Get All the unprocessed messages
      while true
        message = getMessage(m.port, 3)
        if message = invalid
          exit while
        else
          events.push(message)
        end if
      end while

      ? "Found" events.count() " unprocessed events..."
    end if

    ' enum CodeCoverageLineType
    '     noCode = 0
    '     code = 1
    '     condition = 2
    '     branch = 3
    '     function = 4
    ' end enum

    for each event in events
      entry = event.getData()
      if entry <> invalid
        file = m.coverageMap.files[entry.f]
        if entry.r = 4 ' CodeCoverageLineType.function
          if file.functions[entry.fn].totalHit = 0
            file.functionTotalHit ++
          end if
          file.functions[entry.fn].totalHit ++
        else if entry.r = 3 ' CodeCoverageLineType.branch
          for each branch in file.blocks[entry.bl].branches
            if branch.id = entry.br
              if branch.totalHit = 0
                file.branchTotalHit ++
              end if
              branch.totalHit ++
              exit for
            end if
          end for
        else if entry.r = 1 ' CodeCoverageLineType.code
          for each line in file.lines
            if line.lineNumber = entry.l
              if line.totalHit = 0
                file.lineTotalHit ++
              end if
              line.totalHit ++
              exit for
            end if
          end for
        end if
        m.coverageMap.files[entry.f] = file
      end if
    end for

    if saving = true
      m.top.coverageResults = m.coverageMap
      return
    end if
  end while

end function


' Gets the next message from the message port and applies a short sleep if no message was returned.
' @param {roMessagePort} port - The active message port to get messages from.
' @param {Integer} [sleepInterval] - How long to sleep if there was no message returned.
' @return {Dynamic} Any resulting message from the message port.
function getMessage(port as object, sleepInterval = 20 as integer) as dynamic
  message = port.getMessage()
  ' I know I will always get something from the port so no need for the uninitialized check in isInvalid
  if message = invalid then sleep(sleepInterval)
  return message
end function

#if false
  sub test()
    player = m.player

    report = false
    if player = invalid or (player.duration > 0 and player.state = "playing") then
      report = true
    end if

    if report = true then
      player.control = "stop"
    end if
  end sub


  sub test()
    player = m.player

    report = false
    if RBS_CC_0_reportCondition(109, 1, player = invalid) or RBS_CC_0_reportCondition(109, 2, (RBS_CC_0_reportCondition(109, 3, player.duration > 0) and RBS_CC_0_reportCondition(109, 4, player.state = "playing"))) then
      report = true
    end if

    if report = true then
      player.control = "stop"
    end if
  end sub
#end if
