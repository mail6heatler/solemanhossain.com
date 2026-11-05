// Credits for the free pictures built into the fan themes. Licence and author come from each file's own record on
// Wikimedia Commons. Files were cropped and compressed. Keep these lines on the site: CC licences require them.
export type Credit = { title: string; author: string; license: string; licenseUrl?: string; page: string };

export const THEME_CREDITS: Record<string, Credit> = {
  messi: { title: "2025 Leagues Cup Final warmups", author: "Barcaforever69", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://commons.wikimedia.org/wiki/File:2025_Leagues_Cup_Final_-_Lionel_Messi_during_warmups.jpg" },
  verstappen: { title: "2026 Chinese GP, Max Verstappen, Qualifying", author: "Liauzh", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", page: "https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Red_Bull_-_Max_Verstappen_-_Qualifying.jpg" },
  interstellar: { title: "Cosmic Cliffs (James Webb Space Telescope)", author: "NASA, ESA, CSA, STScI", license: "Public domain", page: "https://commons.wikimedia.org/wiki/File:NASA%E2%80%99s_Webb_Reveals_Cosmic_Cliffs,_Glittering_Landscape_of_Star_Birth.jpg" },
  bangladesh: { title: "National Martyrs' Memorial", author: "Azim Khan Ronnie", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:National_Martyrs%E2%80%99_Memorial_08.jpg" },
  palestine: { title: "Olive Harvest", author: "Aallen", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", page: "https://commons.wikimedia.org/wiki/File:Olive_Harvest.jpg" },
  islamic: { title: "Nasir al-Mulk Mosque, Shiraz", author: "Diego Delso", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:Mezquita_de_Nasirolmolk,_Shiraz,_Ir%C3%A1n,_2016-09-24,_DD_66-68_HDR.jpg" },
  travel: { title: "Moraine Lake", author: "Gorgo", license: "Public domain", page: "https://commons.wikimedia.org/wiki/File:Moraine_Lake_17092005.jpg" },
};

/** Themes built around someone else's person, character or story: the site says it's an unofficial fan theme. */
export const FAN_THEMES = ["messi", "batman", "spiderman", "verstappen", "khabib", "arthur", "naruto", "sparrow", "dabbe", "salman", "rangers", "tomjerry", "ben10", "got", "potter", "interstellar"];
