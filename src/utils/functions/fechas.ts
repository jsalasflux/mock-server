export function getFecha() {
  const today = new Date();
  let dd = today.getDate().toString();
  let mm = (today.getMonth() + 1).toString();

  const yyyy = today.getFullYear();
  if (parseInt(dd) < 10) {
    dd = '0' + dd;
  }
  if (parseInt(mm) < 10) {
    mm = '0' + mm;
  }
  return dd + '/' + mm + '/' + yyyy;
}

export function randomDate(monthDiff = 3): string {
  const end = new Date();
  const start = new Date();
  start.setMonth(end.getMonth() - monthDiff);

  return randomDateBetweenTwoDates(start, end);
}

function randomDateBetweenTwoDates(start, end) {
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}
