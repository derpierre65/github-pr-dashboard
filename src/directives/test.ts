import { Directive } from 'vue';
import type { DirectiveBinding } from 'vue';

declare module 'vue' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export interface ComponentCustomProperties {
    vTest: Directive<HTMLElement, string>;
  }
}

function updateElement(el: Element, binding: DirectiveBinding) {
  let finalElement = el;
  if (el.tagName === 'LABEL') {
    finalElement = el.querySelector('input') || finalElement;
  }

  let value = binding.value || binding.arg;
  if (Array.isArray(value)) {
    value = value.filter(Boolean).join('_');
  }

  finalElement.setAttribute('data-testid', value);
}

const vTest: Directive = import.meta.env.PROD ? {} : {
  created(el, binding) {
    return updateElement(el, binding);
  },
  updated(el, binding) {
    return updateElement(el, binding);
  },
};

export {
  vTest,
};
