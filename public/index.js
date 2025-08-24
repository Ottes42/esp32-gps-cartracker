
import { loadFuelMarkers, fmtMonthLocal, fmtCurrencyEUR, fmtNumber } from './app.js';

window.addEventListener('DOMContentLoaded', async ()=>{
  // Map
  const map = L.map('map').setView([50.2,8.6], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom: 19 }).addTo(map);
  loadFuelMarkers(map, document.getElementById('status'));

  // Monthly table
  try {
    const rows = await fetch('/api/fuel/months').then(r=>r.json());
    const tbody = document.getElementById('monthBody');
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${fmtMonthLocal(r.month)}</td>
                      <td>${fmtCurrencyEUR(r.cost)}</td>
                      <td>${fmtNumber(r.km/1000,1)} km</td>
                      <td>${fmtNumber(r.liters,1)} L</td>`;
      tbody.appendChild(tr);
    });
  } catch(e){
    document.getElementById('monthBody').innerHTML = `<tr><td colspan="4">Failed to load</td></tr>`;
  }
});
