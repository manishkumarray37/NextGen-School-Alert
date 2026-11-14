/**
 * ===================================================================
 * 🧠 ENTERPRISE OMR OPTICAL EVALUATION & PDF GENERATION ENGINE
 * ===================================================================
 * Dependencies: jsPDF, QRCode, OpenCV.js, jsQR, SheetJS (xlsx)
 * Standard Normalized Dimension: 1000 x 1414 px (A4 Ratio)
 */

window.OMREngine = (function () {
  'use strict';

  // 1. DETERMINISTIC COORDINATE DICTIONARY FOR 5 A4 FORMATS
  function getTemplateCoordinates(templateType) {
    const type = parseInt(templateType, 10);
    const configs = {
      25:  { cols: 2, qPerCol: [13, 12], startY: 280, rowH: 42, colX: [140, 560], r: 12, optGap: 55, numOffset: 45 },
      50:  { cols: 2, qPerCol: [25, 25], startY: 260, rowH: 38, colX: [140, 560], r: 11, optGap: 55, numOffset: 45 },
      100: { cols: 4, qPerCol: [25, 25, 25, 25], startY: 260, rowH: 38, colX: [85, 305, 525, 745], r: 9.5, optGap: 32, numOffset: 28 },
      120: { cols: 4, qPerCol: [30, 30, 30, 30], startY: 250, rowH: 33, colX: [85, 305, 525, 745], r: 8.5, optGap: 32, numOffset: 28 },
      180: { cols: 4, qPerCol: [45, 45, 45, 45], startY: 235, rowH: 23, colX: [85, 305, 525, 745], r: 7.0, optGap: 32, numOffset: 28 }
    };

    const cfg = configs[type];
    if (!cfg) throw new Error(`Unsupported OMR template format: ${type}`);

    const questions = {};
    let currentQ = 1;

    for (let c = 0; c < cfg.cols; c++) {
      const qCount = cfg.qPerCol[c];
      const originX = cfg.colX[c];

      for (let r = 0; r < qCount; r++) {
        if (currentQ > type) break;
        const y = cfg.startY + (r * cfg.rowH);

        questions[currentQ] = {
          q: currentQ,
          col: c,
          row: r,
          labelPos: { x: originX, y: y },
          bubbles: {
            A: { x: originX + cfg.numOffset + (0 * cfg.optGap), y: y, r: cfg.r },
            B: { x: originX + cfg.numOffset + (1 * cfg.optGap), y: y, r: cfg.r },
            C: { x: originX + cfg.numOffset + (2 * cfg.optGap), y: y, r: cfg.r },
            D: { x: originX + cfg.numOffset + (3 * cfg.optGap), y: y, r: cfg.r }
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

  // 2. VECTOR A4 STUDENT OMR SHEET GENERATOR (PRE-PRINTED WITH QR CODE)
  async function generateStudentOmrPdf(blueprint, studentsList, schoolMeta) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF library is not loaded.");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const coordMap = getTemplateCoordinates(blueprint.TemplateType || blueprint.template_type || 100);
    const scale = 0.21; // 1000px canvas = 210mm A4 width factor

    // Create invisible QR sandbox element if not present
    let qrBox = document.getElementById("omr_qr_temp_box");
    if (!qrBox) {
      qrBox = document.createElement("div");
      qrBox.id = "omr_qr_temp_box";
      qrBox.style.display = "none";
      document.body.appendChild(qrBox);
    }

    const subjectHeaders = {};
    const subjects = blueprint.Subjects || blueprint.subjects || [];
    subjects.forEach(s => {
      subjectHeaders[s.start_q] = `${s.name} (Q${s.start_q}-${s.end_q})`;
    });

    const students = (studentsList && studentsList.length > 0) ? studentsList : [
      { StudId: "DEMO-101", RollNo: "01", StudentName: "Sample Student Candidate" }
    ];

    for (let i = 0; i < students.length; i++) {
      if (i > 0) doc.addPage();
      const st = students[i];

      // A. 4 Solid Black Fiducial Corner Anchors (6mm x 6mm)
      doc.setFillColor(0, 0, 0);
      doc.rect(8, 8, 6, 6, "F");       // Top-Left
      doc.rect(196, 8, 6, 6, "F");     // Top-Right
      doc.rect(8, 283, 6, 6, "F");     // Bottom-Left
      doc.rect(196, 283, 6, 6, "F");   // Bottom-Right

      // B. Header Information Box
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.rect(17, 8, 143, 27);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(String(schoolMeta.schoolName || "INSTITUTIONAL EXAMINATION BOARD").toUpperCase(), 20, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Exam: ${blueprint.ExamName || blueprint.title || "Periodic Assessment"} | Class: ${blueprint.Class || blueprint.class_id || "All"}`, 20, 19);
      doc.text(`Candidate: ${st.StudentName || st.name || "Student"} | Roll No: ${st.RollNo || st.roll || "00"} | ID: ${st.StudId || st.id || "NA"}`, 20, 24);

      const subRanges = subjects.map(s => `${s.name}(${s.start_q}-${s.end_q})`).join(" | ");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Subjects: ${subRanges}`, 20, 30);
      doc.setTextColor(0, 0, 0);

      // C. Render High-Density Metadata QR Code
      const qrData = JSON.stringify({
        sid: st.StudId || st.id,
        bpid: blueprint.BlueprintID || blueprint.blueprint_id,
        r: st.RollNo || st.roll
      });

      qrBox.innerHTML = "";
      new QRCode(qrBox, { text: qrData, width: 90, height: 90, correctLevel: QRCode.CorrectLevel.M });
      await new Promise(r => setTimeout(r, 45));

      const qrCanvas = qrBox.querySelector("canvas");
      if (qrCanvas) {
        const qrBase64 = qrCanvas.toDataURL("image/png");
        doc.addImage(qrBase64, "PNG", 164, 8, 27, 27);
      }

      // D. Candidate Instruction Bar
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text("Instructions: Use Dark Blue or Black Ballpoint Pen only. Fill bubbles completely. Do not fold, crinkle or staple this sheet.", 17, 39);

      // E. Render Question Grid and Bubbles
      const totalQuestions = blueprint.TemplateType || blueprint.template_type || 100;

      for (let q = 1; q <= totalQuestions; q++) {
        const qData = coordMap.questions[q];
        if (!qData) continue;

        // Print subject separator header if question begins a subject range
        if (subjectHeaders[q]) {
          doc.setFillColor(241, 245, 249);
          doc.rect((qData.labelPos.x - 3) * scale, (qData.labelPos.y - 18) * scale, 34, 3.8, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(2, 132, 199);
          doc.text(`[ ${subjectHeaders[q].toUpperCase()} ]`, (qData.labelPos.x - 1) * scale, (qData.labelPos.y - 11) * scale);
          doc.setTextColor(0, 0, 0);
        }

        // Question Number
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(String(q).padStart(2, "0"), qData.labelPos.x * scale, (qData.labelPos.y + 3) * scale);

        // Bubbles A, B, C, D
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);

        ["A", "B", "C", "D"].forEach(opt => {
          const b = qData.bubbles[opt];
          const bx = b.x * scale;
          const by = b.y * scale;
          const br = b.r * scale;

          doc.setDrawColor(100, 116, 139);
          doc.setLineWidth(0.2);
          doc.circle(bx, by, br, "S");
          doc.text(opt, bx - 0.9, by + 1.0);
        });
      }
    }

    doc.save(`OMR_${blueprint.Class || "Class"}_${blueprint.BlueprintID || "Exam"}.pdf`);
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

    // A. Preprocessing: Grayscale -> Gaussian Blur -> Adaptive Binary Inversion
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 3);

    // B. Locate 4 Solid Black Fiducial Corner Squares
    cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const squareCandidates = [];
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);

      if (area > 300 && area < 45000) {
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.04 * peri, true);

        if (approx.rows === 4) {
          const rect = cv.boundingRect(approx);
          const aspect = rect.width / rect.height;
          if (aspect >= 0.78 && aspect <= 1.28) {
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
      // Sort corners geometrically
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

    // C. Binarize Warped Image for Bubble Reading
    const warpedGray = new cv.Mat();
    cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(warpedGray, warpedThresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    // D. Extract and Decode QR Code (Upper Right Corner)
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

    // E. Extract Bubble Darkness Ratios
    const totalQ = blueprint.TemplateType || blueprint.template_type || 100;
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

      // Threshold: > 52% dark pixels qualifies as marked
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

    // Clean up OpenCV memory
    src.delete();
    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
    warped.delete();
    warpedGray.delete();
    warpedThresh.delete();

    // F. Evaluate Scores Subject by Subject
    return computeEvaluationPayload(studentMeta, studentAnswers, flags, blueprint, answerKeyConfig);
  }

  // 4. MULTI-SUBJECT SCORING & TALLY CALCULATOR
  function computeEvaluationPayload(studentMeta, studentAnswers, flags, blueprint, answerKeyConfig) {
    const markR = parseFloat(answerKeyConfig.RightMarks || answerKeyConfig.right || 1.0);
    const markW = parseFloat(answerKeyConfig.WrongMarks || answerKeyConfig.wrong || 0.0);
    const markB = parseFloat(answerKeyConfig.BlankMarks || answerKeyConfig.blank || 0.0);
    const keys = answerKeyConfig.Keys || answerKeyConfig.keys || {};
    const subjects = blueprint.Subjects || blueprint.subjects || [];

    let totalR = 0;
    let totalW = 0;
    let totalBlank = 0;
    const subjectsScore = {};

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
      blueprintId: blueprint.BlueprintID || blueprint.blueprint_id,
      examName: blueprint.ExamName || blueprint.title,
      class: blueprint.Class || blueprint.class_id,
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

  // 5. EXCEL SPREADSHEET EXPORTER (.XLSX)
  function exportToExcel(resultsArray, blueprint) {
    if (!window.XLSX) {
      throw new Error("SheetJS (xlsx) library is not loaded.");
    }
    const subjects = blueprint.Subjects || blueprint.subjects || [];

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

      subjects.forEach(s => {
        const sc = r.subjectsScore[s.name] || { R: 0, W: 0 };
        row[`${s.name} (Right)`] = sc.R;
        row[`${s.name} (Wrong)`] = sc.W;
        row[`${s.name} (Blank)`] = s.total - (sc.R + sc.W);
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OMR_Evaluation");
    XLSX.writeFile(wb, `OMR_Report_${blueprint.BlueprintID || "Exam"}.xlsx`);
  }

  // Public Interface
  return {
    getCoordinates: getTemplateCoordinates,
    generatePdf: generateStudentOmrPdf,
    evaluateImage: evaluateOmrImage,
    recalculate: computeEvaluationPayload,
    exportExcel: exportToExcel
  };
})();
