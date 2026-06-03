// Format Thai Baht
export const formatTHB = (amount) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB', maximumFractionDigits: 0
  }).format(amount);
};

// Short THB (e.g. 1,500 ฿)
export const formatTHBShort = (amount) => {
  if (amount == null) return '—';
  return Number(amount).toLocaleString('th-TH') + ' ฿';
};

// Convert CE date string "YYYY-MM-DD" to Thai BE display "DD/MM/YYYY+543"
export const toBE = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const thaiMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const be = parseInt(year) + 543;
  const m = parseInt(month);
  return `${parseInt(day)} ${thaiMonths[m]} ${be}`;
};

// Short BE: "DD/MM/BE"
export const toBEShort = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${parseInt(year) + 543}`;
};

// Current date in BE
export const todayBE = () => {
  const now = new Date();
  const thaiMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${now.getDate()} ${thaiMonths[now.getMonth()+1]} ${now.getFullYear() + 543}`;
};
