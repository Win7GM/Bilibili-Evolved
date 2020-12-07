const languageCodeMap: { [key: string]: string } = {
  "日本語": "ja-JP",
  "English": "en-US",
  "Deutsch": "de-DE",
};
export class Translator {
  static textNode: TextNodeTranslator;
  static title: TitleTranslator;
  static placeholder: PlaceholderTranslator;
  static settingsDropdown: SettingsDropdownTranslator;
  static sensitiveTranslators: Translator[];
  static map: Map<string, any>;
  static regex: [RegExp, string][];

  accepts(node: Node) { return node.nodeType === Node.ELEMENT_NODE; }
  getValue(node: Node) { return node.nodeValue; }
  setValue(node: Node, value: string) { node.nodeValue = value; }
  getElement(node: Node) { return node as Element; }
  translate(node: Node) {
    let value = this.getValue(node);
    if (!value || typeof value !== "string" || value === "*") {
      return;
    }
    value = value.trim();
    const translation = Translator.map.get(value);
    if (translation === undefined) {
      const result = Translator.regex.find(([r]) => r.test(value!));
      if (result) {
        const [regex, replacement] = result;
        this.setValue(node, value.replace(regex, replacement));
      }
    }
    else if (typeof translation === "string") {
      this.setValue(node, translation);
    }
    else if (Array.isArray(translation)) {
      let finalTranslation = null;
      for (const subTranslation of translation) {
        if (typeof subTranslation === "string") {
          finalTranslation = subTranslation;
        }
        else {
          const { text, selector, not } = subTranslation;
          if (this.getElement(node)?.matches(selector) !== Boolean(not)) {
            finalTranslation = text;
          }
        }
      }
      if (finalTranslation !== null) {
        this.setValue(node, finalTranslation);
      }
    }
    else {
      const { text, selector, not } = translation;
      if (this.getElement(node)?.matches(selector) !== Boolean(not)) {
        this.setValue(node, text);
      }
    }
  }
  // https://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page
  static walk(rootElement: Node, action: (node: Node) => void) {
    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);
    let node = walker.nextNode();
    while (node) {
      action(node);
      node = walker.nextNode();
    }
  }
  static translate(rootElement: Node) {
    if (rootElement.nodeType === Node.TEXT_NODE) {
      Translator.textNode.translate(rootElement);
      return;
    }
    const translateNode = (node: Node) => {
      for (const translator of Translator.sensitiveTranslators) {
        if (translator.accepts(node)) {
          translator.translate(node);
        }
      }
    };
    translateNode(rootElement);
    Translator.walk(rootElement, translateNode);
  }
  static translateCssMatches() {
    const selectors = Translator.map.get("*");
    if (!selectors) {
      return;
    }
    for (const { selector, text } of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        [...element.childNodes].filter(it => it.nodeType === Node.TEXT_NODE).forEach(it => it.nodeValue = text);
      }
    }
  }
}
export class TextNodeTranslator extends Translator {
  accepts(node: Node) { return node.nodeType === Node.TEXT_NODE; }
  getElement(node: Node) {
    return node.parentElement!;
  }
}
export class TitleTranslator extends Translator {
  getValue(node: Node) { return (node as Element).getAttribute("title"); }
  setValue(node: Node, value: string) {
    (node as Element).setAttribute("title", value);
  }
}
export class PlaceholderTranslator extends Translator {
  // accepts(node: Node) { return node.nodeName === "INPUT" && (node as HTMLInputElement).type.toUpperCase() === "TEXT" || node.nodeName === "TEXTAREA"; }
  getValue(node: Node) { return (node as Element).getAttribute("placeholder"); }
  setValue(node: Node, value: string) {
    (node as Element).setAttribute("placeholder", value);
  }
}

export class SettingsDropdownTranslator extends Translator {
  accepts(node: Node) { return node instanceof HTMLInputElement && node.hasAttribute("key"); }
  getValue(node: Node) { return (node as HTMLInputElement).value; }
  setValue(node: Node, value: string) {
    (node as HTMLInputElement).value = value;
  }
}

Translator.textNode = new TextNodeTranslator;
Translator.title = new TitleTranslator;
Translator.placeholder = new PlaceholderTranslator;
Translator.settingsDropdown = new SettingsDropdownTranslator;
Translator.sensitiveTranslators = [Translator.textNode, Translator.title, Translator.placeholder];

const startTranslate = async () => {
  const languageCode = languageCodeMap[settings.i18nLanguage];
  const { map, regex } = await import(`./i18n.${languageCode}`);
  document.documentElement.setAttribute("lang", languageCode);
  Translator.map = map as Map<string, any>;
  Translator.regex = [...regex.entries()] as Array<[RegExp, string]>;

  Translator.translate(document.body);
  Translator.translateCssMatches();
  Observer.observe("body", records => {
    records.forEach(it => {
      if (it.type === "childList") {
        if (it.addedNodes.length > 0) {
          Translator.translateCssMatches();
        }
        it.addedNodes.forEach(node => {
          Translator.translate(node);
        });
      }
      else if (it.type === "characterData") {
        Translator.textNode.translate(it.target);
      }
      else if (it.type === "attributes") {
        if (it.attributeName === "title") {
          Translator.title.translate(it.target);
        }
        else if (it.attributeName === "placeholder") {
          Translator.placeholder.translate(it.target);
        }
      }
    });
  }, { characterData: true, childList: true, subtree: true, attributes: true });
  const iconPanel = await SpinQuery.select(".gui-settings-icon-panel");
  iconPanel!.addEventListener("be:load", () => {
    Translator.walk(document.querySelector(".gui-settings-box")!, node => Translator.settingsDropdown.translate(node));
  }, { once: true });
};
startTranslate();
// if (document.readyState === "complete")
// {
//     startTranslate();
// }
// else
// {
//     unsafeWindow.addEventListener('load', () => startTranslate());
// }

export default {
  export: {
    Translator,
    TextNodeTranslator,
    TitleTranslator,
    PlaceholderTranslator,
  },
};