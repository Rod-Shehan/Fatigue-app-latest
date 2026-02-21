import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sheetId } = await req.json();
    if (!sheetId) return Response.json({ error: 'sheetId required' }, { status: 400 });

    const sheets = await base44.asServiceRole.entities.FatigueSheet.list('-week_starting', 100);
    const sheet = sheets.find(s => s.id === sheetId);
    if (!sheet) return Response.json({ error: 'Sheet not found' }, { status: 404 });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 14;
    const colW = pageW - margin * 2;

    // ── Header ──
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('FATIGUE RECORD SHEET', margin, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('WA Commercial Driver Fatigue Management', margin, 16);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Perth' })}`, pageW - margin, 16, { align: 'right' });

    // ── Sheet Details ──
    let y = 30;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    const details = [
      ['Driver', sheet.driver_name || '—'],
      ['Second Driver', sheet.second_driver || '—'],
      ['Driver Type', sheet.driver_type === 'two_up' ? 'Two-Up' : 'Solo'],
      ['Destination', sheet.destination || '—'],
      ['Week Starting', sheet.week_starting || '—'],
      ['Status', sheet.status === 'completed' ? 'Completed' : 'Draft'],
    ];

    // Two columns
    const half = Math.ceil(details.length / 2);
    details.forEach(([label, value], i) => {
      const col = i < half ? 0 : 1;
      const row = i < half ? i : i - half;
      const x = margin + col * (colW / 2);
      const ry = y + row * 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(label.toUpperCase(), x, ry);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(String(value), x + 28, ry);
    });

    y += (half) * 7 + 6;

    // ── Divider ──
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // ── Day rows ──
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getHours = (arr) => (arr || []).filter(Boolean).length * 0.5;

    (sheet.days || []).forEach((day, idx) => {
      if (!day) return;
      const workH = getHours(day.work_time);
      const breakH = getHours(day.breaks);
      const restH = getHours(day.non_work);
      if (workH + breakH + restH === 0 && !day.truck_rego && !day.date) return;

      // Check if we need a new page
      if (y > 250) { doc.addPage(); y = 20; }

      // Day header bar
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y - 4, colW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(`${dayLabels[idx]}  ${day.date || ''}`, margin + 2, y);
      if (day.truck_rego) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Rego: ${day.truck_rego}`, margin + 60, y);
      }
      if (day.start_kms != null && day.end_kms != null) {
        const km = (day.end_kms - day.start_kms).toFixed(0);
        doc.text(`${day.start_kms} → ${day.end_kms} km  (${km} km)`, pageW - margin, y, { align: 'right' });
      }
      y += 6;

      // Hours row
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const stats = [
        [`Work: ${workH}h`, [59, 130, 246]],
        [`Breaks: ${breakH}h`, [251, 191, 36]],
        [`Rest: ${restH}h`, [52, 211, 153]],
      ];
      stats.forEach(([text, color], si) => {
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, margin + 2 + si * 36, y);
      });

      // Events
      const events = day.events || [];
      if (events.length > 0) {
        y += 5;
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(6.5);
        const evLine = events.map(e => {
          const t = new Date(e.time);
          const hh = t.getHours().toString().padStart(2, '0');
          const mm = t.getMinutes().toString().padStart(2, '0');
          return `${hh}:${mm} ${e.type}`;
        }).join('  →  ');
        const lines = doc.splitTextToSize(evLine, colW - 4);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4;
      }

      y += 5;
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y - 2, pageW - margin, y - 2);
    });

    y += 4;

    // ── Totals ──
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, colW, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const totalWork = (sheet.days || []).reduce((s, d) => s + getHours(d?.work_time), 0);
    const totalBreak = (sheet.days || []).reduce((s, d) => s + getHours(d?.breaks), 0);
    const totalRest = (sheet.days || []).reduce((s, d) => s + getHours(d?.non_work), 0);
    doc.text(`TOTALS — Work: ${totalWork}h  |  Breaks: ${totalBreak}h  |  Rest: ${totalRest}h`, margin + 2, y + 5.5);
    y += 14;

    // ── Signature ──
    if (sheet.signature) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('DRIVER SIGNATURE', margin, y);
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, y, 80, 30);
      try {
        doc.addImage(sheet.signature, 'PNG', margin + 1, y + 1, 78, 28);
      } catch (_) { /* skip if image fails */ }
      if (sheet.signed_at) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Signed: ${new Date(sheet.signed_at).toLocaleString('en-AU', { timeZone: 'Australia/Perth' })}`, margin, y + 34);
      }
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="fatigue-sheet-${sheet.driver_name?.replace(/\s+/g, '-') || 'unknown'}-${sheet.week_starting || 'draft'}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});