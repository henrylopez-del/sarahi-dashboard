/**
 * Sarahi Jaramillo — Form → Google Sheet webhook
 *
 * Recibe data de form (JSON POST) y escribe al sheet "Form" insertando
 * la fila nueva debajo del header (row 2), empujando las viejas hacia abajo.
 *
 * Fecha en formato dd/MM/yyyy (timezone America/Cancun).
 *
 * ⚠️ GUARDRAILS
 *  - NO toca el header (row 1)
 *  - NO usa insertRowBefore(1) — rompería el header
 *  - Idempotente por sheet_row_hash si se envía (dedup en Supabase)
 *  - try/catch para que fallas no rompan la entrega de leads
 *
 * Última actualización: 2026-04-23
 */

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Form'); // ajusta si el tab se llama distinto
    if (!sheet) throw new Error('Tab "Form" no existe');

    const data = JSON.parse(e.postData.contents);

    // Fecha en formato simple dd/MM/yyyy
    const fechaFmt = Utilities.formatDate(new Date(), 'America/Cancun', 'dd/MM/yyyy');

    // Arma la fila — el orden debe coincidir con las columnas del sheet
    const row = [
      fechaFmt,                              // A · Fecha
      data.nombre || '',                     // B · Nombre
      data.telefono || data.phone || '',     // C · Teléfono
      data.correo || data.email || '',       // D · Correo
      data.utm_source || '',                 // E · UTM source
      data.utm_medium || '',                 // F · UTM medium
      data.utm_campaign || '',               // G · UTM campaign
      data.utm_adset || '',                  // H · UTM adset
      data.utm_content || '',                // I · UTM content
      data.utm_source_first_click || '',     // J · first click source
      data.utm_campaign_first_click || '',   // K · first click campaign
      data.utm_content_first_click || '',    // L · first click content
      data.estado || ''                      // M · Estado (opcional)
      // agregar más columnas si hay
    ];

    // Inserta arriba (debajo del header en row 1)
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, row.length).setValues([row]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, row_inserted: 2 }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('[sarahi-form-webhook] ERROR: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Opcional: formato de fecha con mes en español (23-abr-2026)
 * Reemplaza `fechaFmt` arriba por una llamada a esta función si lo prefieres
 */
function fechaEsCorta(d) {
  d = d || new Date();
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return String(d.getDate()).padStart(2, '0')
    + '-' + meses[d.getMonth()]
    + '-' + d.getFullYear();
}

/**
 * Helper para testing manual desde el editor
 * Run → doPost → autoriza permisos la primera vez
 */
function testDoPost() {
  const mockEvent = {
    postData: {
      contents: JSON.stringify({
        nombre: 'Test User',
        telefono: '+521234567890',
        email: 'test@example.com',
        utm_source: 'facebook',
        utm_campaign: 'test-campaign',
        utm_content: 'test-ad-vic'
      })
    }
  };
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}
