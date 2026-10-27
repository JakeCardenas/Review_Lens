function words(list: string): Set<string> {
  return new Set(list.split(/\s+/).filter(Boolean));
}

/** Common English function words. Also used as stopwords for keywords. */
export const FUNCTION_WORDS = words(`
  the a an and or but if so to of in on at for with without from by about as into after before over under
  again then than too very really just only also not no nor is are was were be been being am do does did done
  have has had will would can could should may might must shall i me my mine myself we us our you your he him his
  she her it its they them their this that these those there here what which who whom when where why how all any
  some more most much many few other another each every both one two three still even ever never always ok okay
  yes im ive id dont didnt doesnt isnt wasnt werent cant couldnt wont wouldnt shouldnt aint thats theres
  i'm i've i'd don't didn't doesn't isn't wasn't weren't can't couldn't won't wouldn't shouldn't that's there's
  it's they're you're we're let's get got gets getting
`);

/** Words that start a two-word keyword phrase even though they are stopwords ("not worth"). */
export const NEGATIONS = words(`not no never dont didnt doesnt isnt wasnt cant wont don't didn't doesn't isn't wasn't can't won't`);

/** Frequent review vocabulary, used only to recognise English text. */
const REVIEW_WORDS = words(`
  good great bad poor excellent amazing awesome terrible awful horrible nice fine love loved loves like liked
  hate hated best worst better worse happy unhappy disappointed disappointing satisfied recommend recommended
  product products item items order ordered delivery delivered shipping shipped arrived arrive arrives late
  fast quick quickly slow slowly quality price prices value money worth cheap expensive service customer support
  staff return returned refund box package packaging size fit small large big tight easy hard difficult works
  work worked working broke broken damaged perfect perfectly beautiful comfortable sturdy flimsy week weeks day
  days month months time use used using buy bought purchase came come received missing wrong right well made
  looks look color colour battery screen sound taste smell shoes shirt kettle phone charger everything nothing
  something thanks thank super fantastic decent average overall pretty lovely solid cute soft strong heavy light
  waste cheaply nicely exactly expected expectations description pictures picture photo seller store shop again
`);

export const ENGLISH_WORDS = new Set([...FUNCTION_WORDS, ...REVIEW_WORDS]);

/**
 * Frequent words from other languages often seen in reviews. Words that are also English
 * ("a", "in", "me", "no", "at") are left out so English text never counts as foreign.
 */
export const FOREIGN_WORDS = words(`
  el los las del que muy pero una uno unos por para con sin está esta estaba fue es y también porque producto
  bueno buena malo mala llegó calidad precio entrega gracias recomiendo lo le se su mi al
  os um uma não nao muito mas com sem produto bom boa chegou qualidade obrigado você isso foi é
  le les des du une est et très mais avec sans pour pas produit bonne livraison qualité merci je nous vous il elle ce cette
  der das und ist nicht sehr aber mit ohne für ein eine gut schlecht lieferung qualität produkt ich wir sie auch zu
  gli della molto prodotto buono consegna grazie è non sono questo
  het een niet zeer maar met zonder voor goed slecht levering kwaliteit ik wij heel erg
  ang ng mga sa ay na hindi maganda ganda sobra sira kahon mabilis mabagal salamat po talaga naman lang rin ko ito
  yung pa nga kasi dumating pagdating
  yang dan tidak sangat bagus barang pengiriman cepat lambat terima kasih ini itu saya tapi sudah
`);
