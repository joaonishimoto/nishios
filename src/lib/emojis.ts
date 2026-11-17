/** Biblioteca de emojis do seletor de ícones, agrupada por assunto. */
export interface EmojiGroup {
  label: string;
  emojis: string[];
}

const split = (s: string) => s.trim().split(/\s+/);

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: "Saúde e cuidados",
    emojis: split(
      "🩺 🦷 🩸 💊 💉 🩹 🩻 🧬 🔬 🌡️ 👓 🕶️ 🧴 🪥 🧼 🧽 🪒 💈 ✂️ 💅 💇 💆 🧖 🛁 🚿 🧻 😴 🛌 🧘 ❤️ 🫀 🫁 🧠 👁️ 👂 🦴 🏥 🚑 ♿ 🦽",
    ),
  },
  {
    label: "Esporte e movimento",
    emojis: split(
      "🏋️ 🥊 🥋 🏃 🚶 🏊 🚴 🤸 🧗 ⛹️ 🏄 🤽 🚣 🤾 🏌️ 🏇 ⛷️ 🏂 🤺 🤼 ⚽ 🏀 🏐 🎾 🏈 ⚾ 🥎 🏉 🏓 🏸 🥅 ⛳ 🏒 🏑 🥍 🏏 🎳 🛹 🛼 ⛸️ 🎿 🥌 🎯 🏹 🎣 🤿 🚵 🧎 💪 🦵 👟 🥇 🥈 🥉 🏅 🏆 ⏱️",
    ),
  },
  {
    label: "Casa",
    emojis: split(
      "🏠 🏡 🏢 🏗️ 🛋️ 🛏️ 🪑 🚪 🪟 🪞 🛁 🚽 🚰 🧹 🧺 🧽 🪣 🧯 🔥 ❄️ 💡 🔌 🔋 🪫 🕯️ 🔑 🗝️ 🔒 🔨 🔧 🪛 🪚 🧰 🪜 🧱 🪴 🌱 🌿 🌵 🌳 🌻 🌷 💐 🗑️ 📦 🧊 🍳 ☕ 🫖 🍽️ 🧂 🛒 🛍️ 🧸 🖼️",
    ),
  },
  {
    label: "Carro e transporte",
    emojis: split(
      "🚗 🚙 🚕 🏎️ 🚓 🛻 🚚 🚛 🚜 🏍️ 🛵 🚲 🛴 🚌 🚎 🚐 🚆 🚇 🚊 ✈️ 🛫 🛬 🚁 🚀 ⛵ 🚤 🛳️ ⚓ ⛽ 🛞 🚦 🚧 🅿️ 🗺️ 🧭 📍 🧳 🎒 🛂 🎫",
    ),
  },
  {
    label: "Trabalho e estudo",
    emojis: split(
      "💻 🖥️ ⌨️ 🖱️ 🖨️ 📱 ☎️ 📞 📠 💾 💿 📷 🎥 🎙️ 🎧 📡 📚 📖 📕 📗 📘 📙 📓 📒 📝 ✍️ ✏️ 🖊️ 🖌️ 📐 📏 📎 📌 🗂️ 📁 📂 🗄️ 📋 📊 📈 📉 🗓️ 📅 📆 ⏰ ⌛ 🔍 💼 🎓 🏫 🧪 🧮 🔭 🌐 ✉️ 📧 📬 🗣️ 👥 🤝 🧑‍💻 🧑‍🏫 🧑‍🎓 🧑‍💼",
    ),
  },
  {
    label: "Dinheiro e documentos",
    emojis: split(
      "💰 💵 💴 💶 💷 💸 💳 🪙 🏦 🏧 🧾 📄 📃 📑 📜 🪪 🛂 🔏 🖋️ ✅ ☑️ 📮 🏷️ 🎟️ 🛡️ ⚖️ 🏛️ 📢 🔔 💎 👑 🎁 🏧 🧧 📥 📤",
    ),
  },
  {
    label: "Comida e bebida",
    emojis: split(
      "🥗 🍎 🍌 🍇 🍓 🍉 🍊 🍍 🥑 🥦 🥕 🌽 🍅 🥔 🍞 🥐 🧀 🥚 🥩 🍗 🍖 🐟 🍣 🍕 🍔 🍟 🌮 🍝 🍜 🍚 🍲 🥘 🍰 🍫 🍪 🍩 🍦 🍿 🥜 🍯 💧 🥛 ☕ 🍵 🧃 🥤 🧉 🍺 🍷 🥂 🍹 🍴 🥄 🔪",
    ),
  },
  {
    label: "Animais",
    emojis: split(
      "🐶 🐕 🦮 🐩 🐱 🐈 🐈‍⬛ 🐰 🐇 🐹 🐭 🐁 🐿️ 🦔 🐦 🦜 🐤 🦆 🦉 🐢 🦎 🐍 🐠 🐟 🐡 🦈 🐙 🦀 🐴 🐎 🐄 🐖 🐑 🐐 🐓 🦋 🐝 🐞 🐜 🕷️ 🐒 🦁 🐯 🐻 🐼 🦊 🐺 🐘 🦒 🐬 🐳 🦭 🐧 🦖 🐾 🦴 🪶 🥚",
    ),
  },
  {
    label: "Lazer e hobbies",
    emojis: split(
      "🎸 🎹 🥁 🎺 🎷 🎻 🎤 🎵 🎶 🎬 🎞️ 📺 📻 🎮 🕹️ 🎲 ♟️ 🧩 🃏 🎨 🖍️ 🧵 🧶 🪡 📸 🎭 🎪 🎡 🎢 🎠 🏖️ ⛱️ 🏕️ ⛺ 🏔️ 🌋 🏝️ 🌅 🌄 🌃 🎆 🎇 🎉 🎊 🎈 🎂 🥳 🍾 🪩 💃 🕺 🎃 🎄 🧨 🪁 🛶 🔥",
    ),
  },
  {
    label: "Pessoas e sentimentos",
    emojis: split(
      "😀 😄 😁 😊 🙂 😉 😍 🥰 😎 🤓 🤔 😌 😴 🥱 😅 😂 🥲 😢 😭 😤 😡 🤯 😱 🥶 🥵 🤒 🤕 🤧 😷 🤗 🙏 👍 👎 👏 🙌 💪 ✌️ 🤞 👋 🫶 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 👪 👫 💑 👰 🤵 🤰 🧑‍🍼 💍 💌 💔 💖 💙 💚 💛 🧡 💜 🖤",
    ),
  },
  {
    label: "Natureza e clima",
    emojis: split(
      "☀️ 🌤️ ⛅ 🌥️ ☁️ 🌧️ ⛈️ 🌩️ 🌨️ ☃️ 🌬️ 🌪️ 🌈 🌙 🌛 🌕 ⭐ 🌟 ✨ ⚡ 🔥 💧 🌊 🌍 🌎 🌏 🏞️ 🌲 🌴 🍀 🍁 🍂 🍃 🌸 🌺 🌹 🌼 🍄 🪨 🪵",
    ),
  },
  {
    label: "Símbolos",
    emojis: split(
      "📌 🎯 🚩 🏁 ⚠️ 🚫 ⛔ ❗ ❓ 💬 💭 💤 ♻️ ➕ ➖ ✖️ ♾️ 🔁 🔄 ⏩ ⏸️ ⏹️ 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🔶 🔷 🔺 🔻 💯 🆕 🆗 🆘 🔝 📵 🚭 🔞 ☮️ ✝️ ☯️ 🕉️ ⚛️ ♥️ ♠️ ♦️ ♣️",
    ),
  },
];

/** Devolve o primeiro emoji de um texto digitado ou colado, se houver. */
export function firstEmoji(text: string): string | null {
  const segments = [...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(text.trim())];
  const hit = segments.find((s) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s.segment));
  return hit ? hit.segment : null;
}
