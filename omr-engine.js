window.OMREngine = (function () {
  'use strict';

  // 1. UNIVERSAL DYNAMIC COORDINATE GENERATOR (SUPPORTS 30, 50, 75, 100 & ANY COUNT)
  function getTemplateCoordinates(templateType) {
    const type = parseInt(templateType, 10) || 100;

    let cols = 4;
    let colW = 195;
    let r = 9.0;
    let optGap = 32;
    let numOffset = 28;
    let startY = 250;

    if (type <= 30) {
      cols = 2;
      colW = 360;
      r = 12.0;
      optGap = 55;
      numOffset = 45;
      startY = 270;
    } else if (type <= 60) {
      cols = 2;
      colW = 360;
      r = 11.0;
      optGap = 55;
      numOffset = 45;
      startY = 260;
    } else if (type <= 90) {
      cols = 3;
      colW = 260;
      r = 10.0;
      optGap = 42;
      numOffset = 34;
      startY = 255;
    } else {
      cols = 4;
      colW = 195;
      r = type > 120 ? 7.0 : 8.5;
      optGap = 32;
      numOffset = 28;
      startY = 240;
    }

    const qPerCol = Math.ceil(type / cols);
    const availableHeight = 1330 - startY;
    const rowH = Math.min(42, Math.max(18, Math.floor(availableHeight / qPerCol)));

    const colX = [];
    const totalContentW = cols * colW;
    const startX = Math.floor((1000 - totalContentW) / 2) + 15;

    for (let c = 0; c < cols; c++) {
      colX.push(startX + (c * colW));
    }

    const questions = {};
    let currentQ = 1;

    for (let c = 0; c < cols; c++) {
      for (let rIdx = 0; rIdx < qPerCol; rIdx++) {
        if (currentQ > type) break;
        const y = startY + (rIdx * rowH);
        const originX = colX[c];

        questions[currentQ] = {
          q: currentQ,
          col: c,
          row: rIdx,
          labelPos: { x: originX, y: y },
          bubbles: {
            A: { x: originX + numOffset + (0 * optGap), y: y, r: r },
            B: { x: originX + numOffset + (1 * optGap), y: y, r: r },
            C: { x: originX + numOffset + (2 * optGap), y: y, r: r },
            D: { x: originX + numOffset + (3 * optGap), y: y, r: r }
          }
        };
        currentQ++;
      }
    }

    return {
      templateType: type,
      canvasDimensions: { width: 1000, height: 1414 },
      anchors: {
        TL: { x: 45, y: 45, size: 30 },
        TR: { x: 955, y: 45, size: 30 },
        BL: { x: 45, y: 1369, size: 30 },
        BR: { x: 955, y: 1369, size: 30 }
      },
      qrArea: { x: 740, y: 35, width: 170, height: 170 },
      questions: questions
    };
  }

  // 2. VECTOR A4 OMR PDF GENERATOR (AUTHENTIC OMR CRIMSON RED: RGB 185, 28, 28)
  async function generateStudentOmrPdf(blueprint, studentsList, schoolMeta) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF library is not loaded.");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const totalQuestions = parseInt(blueprint.TemplateType || blueprint.template_type || 100, 10);
    const coordMap = getTemplateCoordinates(totalQuestions);
    const scale = 0.21; // 1000px canvas to 210mm A4 width

    // Temporary invisible QR container
    let qrBox = document.getElementById("omr_qr_temp_box");
    if (!qrBox) {
      qrBox = document.createElement("div");
      qrBox.id = "omr_qr_temp_box";
      qrBox.style.display = "none";
      document.body.appendChild(qrBox);
    }

    const students = (studentsList && studentsList.length > 0) ? studentsList : [
      { StudId: "", RollNo: "", StudentName: "_______________________________" }
    ];

    for (let i = 0; i < students.length; i++) {
      if (i > 0) doc.addPage();
      const st = students[i];

      // A. 4 SOLID BLACK CORNER ALIGNMENT SQUARES (6mm x 6mm)
      doc.setFillColor(0, 0, 0);
      doc.rect(8, 8, 6, 6, "F");       // Top-Left
      doc.rect(196, 8, 6, 6, "F");     // Top-Right
      doc.rect(8, 283, 6, 6, "F");     // Bottom-Left
      doc.rect(196, 283, 6, 6, "F");   // Bottom-Right

      // B. HEADER BOX (AUTHENTIC OMR CRIMSON RED BORDER)
      doc.setDrawColor(185, 28, 28); // #b91c1c Dark Red
      doc.setLineWidth(0.45);
      doc.rect(17, 8, 143, 27);

      // School Title in Dark Red
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(185, 28, 28);
      doc.text(String(schoolMeta.schoolName || "INSTITUTIONAL EXAMINATION ASSESSMENT").toUpperCase(), 20, 14);

      // Assessment Info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42); // Clean dark text
      doc.text(`Exam: ${blueprint.ExamName || "Periodic Test"} | Capacity: ${totalQuestions} Questions`, 20, 19);

      if (st.StudId) {
        doc.text(`Candidate: ${st.StudentName || "Student"} | Roll No: ${st.RollNo || "-"} | ID: ${st.StudId}`, 20, 24);
      } else {
        doc.text(`CANDIDATE NAME: ___________________________    ROLL NO: ____________`, 20, 24);
      }

      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text(`Standard Authentic OMR Assessment Sheet &bull; Session 2026-27`, 20, 30);
      doc.setTextColor(0, 0, 0);

      // C. QR Code (Only if candidate ID is present, else blank space)
      if (st.StudId) {
        const qrData = JSON.stringify({
          sid: st.StudId,
          bpid: blueprint.BlueprintID,
          r: st.RollNo
        });

        qrBox.innerHTML = "";
        new QRCode(qrBox, { text: qrData, width: 90, height: 90, correctLevel: QRCode.CorrectLevel.M });
        await new Promise(r => setTimeout(r, 45));

        const qrCanvas = qrBox.querySelector("canvas");
        if (qrCanvas) {
          const qrBase64 = qrCanvas.toDataURL("image/png");
          doc.addImage(qrBase64, "PNG", 164, 8, 27, 27);
        }
      }

      // D. Candidate Instructions (Dark Red Italic)
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(185, 28, 28);
      doc.text("Instructions: Use Dark Blue or Black Ballpoint Pen only. Darken circles completely. Do not fold or tear this sheet.", 17, 39);

      // E. Render Questions & Bubbles in Authentic OMR Dark Red
      doc.setFont("helvetica", "bold");
      doc.setDrawColor(185, 28, 28);  // Circle border color: Dark Red
      doc.setTextColor(185, 28, 28);  // Text color: Dark Red
      doc.setLineWidth(0.28);

      for (let q = 1; q <= totalQuestions; q++) {
        const qData = coordMap.questions[q];
        if (!qData) continue;

        // Question Number
        doc.setFontSize(7.5);
        doc.text(String(q).padStart(2, "0"), qData.labelPos.x * scale, (qData.labelPos.y + 3) * scale);

        // Bubbles: A, B, C, D
        doc.setFontSize(6.5);
        ["A", "B", "C", "D"].forEach(opt => {
          const b = qData.bubbles[opt];
          const bx = b.x * scale;
          const by = b.y * scale;
          const br = b.r * scale;

          doc.circle(bx, by, br, "S");
          doc.text(opt, bx - 0.9, by + 1.0);
        });
      }
    }

    doc.save(`OMR_${totalQuestions}Q_${Date.now()}.pdf`);
  }

  // 3. OPENCV COMPUTER VISION PERSPECTIVE HOMOGRAPHY & BUBBLE EVALUATOR
  async function evaluateOmrImage(imageElement, blueprint, answerKeyConfig) {
    if (!window.cv || !window.cv.imread) {
      throw new Error("OpenCV.js is not initialized yet.");
    }

    const WARP_W = 1000;
    const WARP_H = 1414;

    const src = cv.imread(imageElement);
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresh = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 3);

    cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const squareCandidates = [];
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);

      if (area > 280 && area < 45000) {
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.04 * peri, true);

        if (approx.rows === 4) {
          const rect = cv.boundingRect(approx);
          const aspect = rect.width / rect.height;
          if (aspect >= 0.75 && aspect <= 1.30) {
            const m = cv.moments(cnt);
            if (m.m00 !== 0) {
              squareCandidates.push({ x: m.m10 / m.m00, y: m.m01 / m.m00, area: area });
            }
          }
        }
        approx.delete();
      }
    }

    let warped = new cv.Mat();
    let warpedThresh = new cv.Mat();

    if (squareCandidates.length >= 4) {
      squareCandidates.sort((a, b) => (a.x + a.y) - (b.x + b.y));
      const tl = squareCandidates[0];
      const br = squareCandidates[squareCandidates.length - 1];

      squareCandidates.sort((a, b) => (a.x - a.y) - (b.x - b.y));
      const bl = squareCandidates[0];
      const tr = squareCandidates[squareCandidates.length - 1];

      const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
      const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, WARP_W, 0, WARP_W, WARP_H, 0, WARP_H]);

      const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
      cv.warpPerspective(src, warped, M, new cv.Size(WARP_W, WARP_H));

      srcCoords.delete();
      dstCoords.delete();
      M.delete();
    } else {
      cv.resize(src, warped, new cv.Size(WARP_W, WARP_H));
    }

    const warpedGray = new cv.Mat();
    cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(warpedGray, warpedThresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    // QR Code extraction
    let studentMeta = { sid: "UNKNOWN", r: "NA" };
    if (window.jsQR) {
      const offCanvas = document.createElement("canvas");
      offCanvas.width = WARP_W;
      offCanvas.height = WARP_H;
      cv.imshow(offCanvas, warped);
      const ctxOff = offCanvas.getContext("2d");
      const qrData = ctxOff.getImageData(680, 20, 280, 280);
      const code = jsQR(qrData.data, qrData.width, qrData.height);
      if (code && code.data) {
        try {
          studentMeta = JSON.parse(code.data);
        } catch (e) {
          studentMeta.sid = code.data;
        }
      }
    }

    // Evaluate bubbles
    const totalQ = parseInt(blueprint.TemplateType || blueprint.template_type || 100, 10);
    const coordMap = getTemplateCoordinates(totalQ);
    const studentAnswers = {};
    const flags = {};

    for (let q = 1; q <= totalQ; q++) {
      const qCfg = coordMap.questions[q];
      if (!qCfg) continue;

      const fillRatios = {};
      const radius = qCfg.bubbles.A.r;

      ["A", "B", "C", "D"].forEach(opt => {
        const b = qCfg.bubbles[opt];
        const rx = Math.max(0, Math.floor(b.x - radius));
        const ry = Math.max(0, Math.floor(b.y - radius));
        const rw = Math.min(WARP_W - rx, Math.floor(radius * 2));
        const rh = Math.min(WARP_H - ry, Math.floor(radius * 2));

        const rect = new cv.Rect(rx, ry, rw, rh);
        const roi = warpedThresh.roi(rect);
        const darkPixels = cv.countNonZero(roi);
        fillRatios[opt] = darkPixels / (rw * rh);
        roi.delete();
      });

      const marked = Object.keys(fillRatios).filter(opt => fillRatios[opt] > 0.52);

      if (marked.length === 1) {
        studentAnswers[q] = marked[0];
      } else if (marked.length > 1) {
        studentAnswers[q] = "MULTI";
        flags[q] = "Multiple Bubbles Detected";
      } else {
        studentAnswers[q] = "BLANK";
      }
    }

    src.delete();
    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
    warped.delete();
    warpedGray.delete();
    warpedThresh.delete();

    return computeEvaluationPayload(studentMeta, studentAnswers, flags, blueprint, answerKeyConfig);
  }

  // 4. SCORING & TALLY CALCULATOR
  function computeEvaluationPayload(studentMeta, studentAnswers, flags, blueprint, answerKeyConfig) {
    const markR = parseFloat(answerKeyConfig.RightMarks || 1.0);
    const markW = parseFloat(answerKeyConfig.WrongMarks || 0.0);
    const markB = parseFloat(answerKeyConfig.BlankMarks || 0.0);
    const keys = answerKeyConfig.Keys || {};
    const totalQ = parseInt(blueprint.TemplateType || 100, 10);

    let totalR = 0;
    let totalW = 0;
    let totalBlank = 0;
    const subjectsScore = {};

    const subjects = (blueprint.Subjects && blueprint.Subjects.length > 0) 
      ? blueprint.Subjects 
      : [{ name: "General Assessment", start_q: 1, end_q: totalQ, total: totalQ }];

    subjects.forEach(sub => {
      let subR = 0;
      let subW = 0;

      for (let q = sub.start_q; q <= sub.end_q; q++) {
        const studentAns = studentAnswers[q] || "BLANK";
        const correctAns = keys[q] || keys[String(q)] || "A";

        if (correctAns === "*" || studentAns === correctAns) {
          subR++;
          totalR++;
        } else if (studentAns === "BLANK") {
          totalBlank++;
        } else {
          subW++;
          totalW++;
        }
      }
      subjectsScore[sub.name] = { R: subR, W: subW };
    });

    const totalMarks = (totalR * markR) + (totalW * markW) + (totalBlank * markB);

    return {
      studentId: studentMeta.sid || "UNKNOWN",
      rollNo: studentMeta.r || "00",
      blueprintId: blueprint.BlueprintID || "TPL",
      examName: blueprint.ExamName || "Exam",
      class: blueprint.Class || "All",
      subjectsScore: subjectsScore,
      totalRight: totalR,
      totalWrong: totalW,
      totalBlank: totalBlank,
      totalMarks: parseFloat(totalMarks.toFixed(2)),
      hasFlags: Object.keys(flags).length > 0,
      flags: flags,
      rawAnswers: studentAnswers
    };
  }

  // 5. EXCEL EXPORTER (.XLSX)
  function exportToExcel(resultsArray, blueprint) {
    if (!window.XLSX) {
      throw new Error("SheetJS (xlsx) library is not loaded.");
    }

    const rows = resultsArray.map(r => {
      const row = {
        "Roll No": r.rollNo,
        "Student ID": r.studentId,
        "Student Name": r.studentName || `Student ${r.rollNo}`,
        "Total Right": r.totalRight,
        "Total Wrong": r.totalWrong,
        "Total Blank": r.totalBlank,
        "Grand Score": r.totalMarks,
        "Status": r.hasFlags ? "FLAGGED (MULTI)" : "VERIFIED"
      };

      Object.keys(r.subjectsScore).forEach(subName => {
        const sc = r.subjectsScore[subName];
        row[`${subName} (Right)`] = sc.R;
        row[`${subName} (Wrong)`] = sc.W;
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OMR_Evaluation");
    XLSX.writeFile(wb, `OMR_Report_${blueprint.BlueprintID || "Exam"}.xlsx`);
  }

  // Public API Interface
  return {
    getCoordinates: getTemplateCoordinates,
    generatePdf: generateStudentOmrPdf,
    evaluateImage: evaluateOmrImage,
    recalculate: computeEvaluationPayload,
    exportExcel: exportToExcel
  };
})();