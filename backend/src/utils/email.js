const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

const FROM = process.env.SMTP_FROM || 'GPL App <noreply@unilurio.ac.mz>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mined.gov.mz';
const APP_URL = process.env.FRONTEND_URL || 'http://localhost';

// ── Templates ─────────────────────────────────────────────────────────────────

function baseHtml(title, body) {
  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#f5f5f3;margin:0;padding:0}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0}
  .header{background:#185FA5;padding:24px 32px}
  .header h1{color:#fff;margin:0;font-size:18px;font-weight:500}
  .header p{color:#B5D4F4;margin:4px 0 0;font-size:13px}
  .body{padding:28px 32px;color:#333;font-size:14px;line-height:1.6}
  .btn{display:inline-block;background:#185FA5;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;margin:16px 0}
  .pill{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:500}
  .pill-green{background:#EAF3DE;color:#3B6D11}
  .pill-amber{background:#FAEEDA;color:#854F0B}
  .pill-red{background:#FCEBEB;color:#A32D2D}
  .divider{border:none;border-top:1px solid #eee;margin:20px 0}
  .footer{background:#f5f5f3;padding:16px 32px;font-size:12px;color:#888;border-top:1px solid #eee}
  table.info{width:100%;border-collapse:collapse;font-size:13px}
  table.info td{padding:6px 0;border-bottom:1px solid #f0f0f0}
  table.info td:first-child{color:#666;width:40%}
  table.info td:last-child{font-weight:500}
</style></head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>GPL App — Recolha Estatística IES 2024</h1>
      <p>Sistema de Recolha de Dados do Ensino Superior</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">Este email foi enviado automaticamente pelo GPL App. Não responda a este email.</div>
  </div>
</body>
</html>`;
}

// ── Email senders ──────────────────────────────────────────────────────────────

async function sendSubmissionConfirmation({ to, institution, sigla, submittedAt }) {
  if (!process.env.SMTP_HOST) return; // silently skip if not configured
  const date = new Date(submittedAt).toLocaleDateString('pt-MZ', { dateStyle: 'long' });
  const body = `
    <p>Caro(a) responsável,</p>
    <p>O formulário de recolha estatística 2024 da sua instituição foi <strong>submetido com sucesso</strong>.</p>
    <table class="info">
      <tr><td>Instituição</td><td>${institution}</td></tr>
      <tr><td>Sigla</td><td>${sigla || '—'}</td></tr>
      <tr><td>Data de submissão</td><td>${date}</td></tr>
      <tr><td>Estado</td><td><span class="pill pill-amber">Em análise</span></td></tr>
    </table>
    <hr class="divider">
    <p>O Ministério irá rever os dados submetidos e notificá-lo(a) sobre o resultado.</p>
    <a href="${APP_URL}" class="btn">Ver submissão</a>
    <p style="font-size:13px;color:#666">Se encontrar algum erro, contacte o Ministério para reabrir o formulário.</p>
  `;
  await getTransporter().sendMail({
    from: FROM, to,
    subject: `✓ Submissão recebida — ${institution} (${sigla || 'IES'})`,
    html: baseHtml('Submissão recebida', body),
  });
}

async function sendAdminNewSubmission({ institution, sigla, email, provincia, totalEstudantes }) {
  if (!process.env.SMTP_HOST) return;
  const body = `
    <p>Uma nova submissão foi recebida e aguarda revisão.</p>
    <table class="info">
      <tr><td>Instituição</td><td>${institution}</td></tr>
      <tr><td>Sigla</td><td>${sigla || '—'}</td></tr>
      <tr><td>Província</td><td>${provincia || '—'}</td></tr>
      <tr><td>Total de estudantes</td><td>${Number(totalEstudantes).toLocaleString('pt-MZ')}</td></tr>
      <tr><td>Email do responsável</td><td>${email}</td></tr>
    </table>
    <a href="${APP_URL}/admin" class="btn">Ver no painel Admin</a>
  `;
  await getTransporter().sendMail({
    from: FROM, to: ADMIN_EMAIL,
    subject: `Nova submissão — ${institution}`,
    html: baseHtml('Nova submissão recebida', body),
  });
}

async function sendStatusUpdate({ to, institution, status, note }) {
  if (!process.env.SMTP_HOST) return;
  const statusMap = {
    approved: { label: 'Aprovado', pillClass: 'pill-green', msg: 'Os dados da sua instituição foram <strong>aprovados</strong> pelo Ministério.' },
    rejected: { label: 'Requer correcções', pillClass: 'pill-red', msg: 'O Ministério identificou aspectos que necessitam de correcção.' },
    draft: { label: 'Reaberto', pillClass: 'pill-amber', msg: 'O seu formulário foi reaberto para edição.' },
  };
  const s = statusMap[status] || statusMap.draft;
  const body = `
    <p>Caro(a) responsável,</p>
    <p>${s.msg}</p>
    <table class="info">
      <tr><td>Instituição</td><td>${institution}</td></tr>
      <tr><td>Estado</td><td><span class="pill ${s.pillClass}">${s.label}</span></td></tr>
      ${note ? `<tr><td>Nota do Ministério</td><td>${note}</td></tr>` : ''}
    </table>
    <a href="${APP_URL}" class="btn">Aceder ao formulário</a>
  `;
  await getTransporter().sendMail({
    from: FROM, to,
    subject: `Actualização do estado — ${institution}: ${s.label}`,
    html: baseHtml('Actualização de estado', body),
  });
}

async function sendPasswordReset({ to, resetUrl }) {
  if (!process.env.SMTP_HOST) return;
  const body = `
    <p>Foi solicitada uma redefinição de palavra-passe para a sua conta.</p>
    <p>Clique no botão abaixo para definir uma nova palavra-passe. O link é válido por <strong>1 hora</strong>.</p>
    <a href="${resetUrl}" class="btn">Redefinir palavra-passe</a>
    <p style="font-size:13px;color:#666">Se não solicitou esta acção, ignore este email.</p>
  `;
  await getTransporter().sendMail({
    from: FROM, to,
    subject: 'Redefinição de palavra-passe — GPL App',
    html: baseHtml('Redefinição de palavra-passe', body),
  });
}

module.exports = {
  sendSubmissionConfirmation,
  sendAdminNewSubmission,
  sendStatusUpdate,
  sendPasswordReset,
};
