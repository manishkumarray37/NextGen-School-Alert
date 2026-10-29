 * 💰 ENTERPRISE FEE CALCULATION & RECONCILIATION ENGINE (fee-engine.js)
   
(function() {
  const ACADEMIC_MONTHS_MAP = {
    "4": "APR", "5": "MAY", "6": "JUN", "7": "JUL", 
    "8": "AUG", "9": "SEP", "10": "OCT", "11": "NOV", 
    "12": "DEC", "1": "JAN", "2": "FEB", "3": "MAR"
  };

  const MONTH_ORDER = ["APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR"];

  /**
   * Helper: Get list of all academic months that should have been billed 
   * from a given start date up to current date.
   */
  window.calculateDueMonthsList = function(feeStartDateStr, sessionStr) {
    let startDate = new Date();
    if (feeStartDateStr) {
      const cleanD = String(feeStartDateStr).trim().split("T")[0];
      const parsed = new Date(cleanD);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }

    const now = new Date();
    let startY = startDate.getFullYear();
    let startM = startDate.getMonth() + 1; // 1-12

    let endY = now.getFullYear();
    let endM = now.getMonth() + 1;

    let activeMonths = [];
    let curY = startY;
    let curM = startM;

    // Loop from start date to current month/year
    while (curY < endY || (curY === endY && curM <= endM)) {
      const mKey = ACADEMIC_MONTHS_MAP[String(curM)];
      if (mKey && !activeMonths.includes(mKey)) {
        activeMonths.push(mKey);
      }
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
      // Safety break to prevent infinite loops (max 36 months)
      if (activeMonths.length >= 36) break;
    }

    // Sort according to standard academic month order (Apr -> Mar)
    return activeMonths.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
  };

  /**
   * CORE ENGINE: Calculate exact financial dues for a specific student.
   * Returns: { pendingMonths: [], totalDueAmount: 0, headsBreakdown: [] }
   */
  window.calculateStudentFeeDues = async function(studentObj, schoolId) {
    if (!studentObj || !schoolId) return { pendingMonths: [], totalDueAmount: 0, headsBreakdown: [] };

    try {
      const admNo = String(studentObj.AdmissionNo || studentObj.StudId || "").trim();
      const sClass = String(studentObj.Class || "Class 1").trim();
      const feeStart = studentObj.FeesStartDate || studentObj.FeeStartDate || studentObj.AdmissionDate || "";
      const session = studentObj.BatchName || studentObj.Session || "2026-27";

      // 1. Get Fee Structures for this Class
      const { data: structures, error: stErr } = await db
        .from('Fee_Structures')
        .select('*')
        .eq('SchoolID', schoolId)
        .eq('Class', sClass);

      if (stErr || !structures || structures.length === 0) {
        return { pendingMonths: [], totalDueAmount: 0, headsBreakdown: [] };
      }

      // 2. Get All Paid Receipts for this Student
      const { data: receipts, error: rcErr } = await db
        .from('Fee_Collections')
        .select('MonthsPaid, Status')
        .eq('SchoolID', schoolId)
        .eq('AdmissionNo', admNo)
        .eq('Status', 'PAID');

      const paidMonthsSet = new Set();
      if (!rcErr && Array.isArray(receipts)) {
        receipts.forEach(r => {
          if (r.MonthsPaid) {
            r.MonthsPaid.split(',').forEach(m => paidMonthsSet.add(m.trim().toUpperCase()));
          }
        });
      }

      // 3. Get all months that should be billed
      const allBilledMonths = window.calculateDueMonthsList(feeStart, session);

      // 4. Filter out already paid months to find true pending months
      const pendingMonths = allBilledMonths.filter(m => !paidMonthsSet.has(m));

      if (pendingMonths.length === 0) {
        return { pendingMonths: [], totalDueAmount: 0, headsBreakdown: [] };
      }

      // 5. Compute financial dues based on frequency
      let totalDueAmount = 0;
      let headsMap = {};

      structures.forEach(st => {
        const headName = st.FeeHead;
        const unitAmt = parseFloat(st.Amount) || 0;
        const freq = String(st.Frequency || "MONTHLY").toUpperCase();

        let headTotal = 0;
        if (freq === "MONTHLY") {
          headTotal = unitAmt * pendingMonths.length;
        } else if (freq === "QUARTERLY") {
          // Check how many quarterly months fall within pending months
          const qMonths = pendingMonths.filter(m => ["JUN", "SEP", "DEC", "MAR"].includes(m));
          headTotal = unitAmt * qMonths.length;
        } else if (freq === "ANNUAL" || freq === "ONE_TIME") {
          // If annual/one-time head is part of the structure, charge it once if any pending month exists
          headTotal = unitAmt;
        }

        if (headTotal > 0) {
          headsMap[headName] = (headsMap[headName] || 0) + headTotal;
          totalDueAmount += headTotal;
        }
      });

      const headsBreakdown = Object.keys(headsMap).map(h => ({
        head: h,
        amount: headsMap[h]
      }));

      return {
        pendingMonths: pendingMonths,
        totalDueAmount: totalDueAmount,
        headsBreakdown: headsBreakdown
      };

    } catch (err) {
      console.error("Fee Engine Calculation Error:", err);
      return { pendingMonths: [], totalDueAmount: 0, headsBreakdown: [] };
    }
  };

  console.log("💰 Enterprise Fee Engine Loaded Successfully.");
})();
