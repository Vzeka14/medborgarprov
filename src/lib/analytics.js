// GoatCounter är laddat med data-goatcounter-settings='{"no_onload":true}'
// (index.html) — scriptet skickar INGEN sidvisning automatiskt när det
// laddas. All räkning sker manuellt här, exakt en gång per rutt-byte,
// INKLUSIVE den allra första sidan som visas. Det gör dubbelräkning vid
// första sidladdningen strukturellt omöjlig (ingen automatisk räkning att
// råka krocka med), istället för att förlita sig på att en race mellan
// auto-pixeln och en manuell anropssekvens råkar gå rätt.
export function trackPageview(path, attempt = 0) {
  if (typeof window === 'undefined') return
  if (window.goatcounter?.count) {
    window.goatcounter.count({ path })
    return
  }
  // count.js laddas async och kan ännu inte ha hunnit köras (särskilt vid
  // den första sidvisningen). Försök igen ett tag istället för att tyst
  // tappa sidvisningen — men ge inte upp för sent om scriptet är blockerat
  // (annonsblockerare o.dyl.), då ska det bara sluta försöka.
  if (attempt < 20) setTimeout(() => trackPageview(path, attempt + 1), 100)
}
