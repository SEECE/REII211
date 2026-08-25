/* The rail, built from a field list. Plain script, one global `Rail`.

   Every old page hand-wrote its control markup — the same `.control-group > h3 > label >
   input` five or six times per page, twelve pages over, with the inline styles that made them
   drift apart. A page now DECLARES its inputs and this emits them in the css/controls.css
   vocabulary:

       Rail(el, [
         { id: 'n', kind: 'range', label: 'Entries', min: 8, max: 120, value: 40 },
         { id: 'order', kind: 'select', label: 'Start from', options: [{ value, label }] },
         { id: 'shuffle', kind: 'button', label: 'Shuffle', variant: 'soft' },
       ], onChange)

   onChange(id, value) fires on any input; a button reports its own id with value `true`.
   Returns { get, set, el, disable } — `get(id)` is typed (a range is a number). */
(function () {
  'use strict';

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.innerHTML = text;
    return n;
  }

  window.Rail = function (root, fields, onChange) {
    var inputs = {}, values = {}, groups = {};

    function fire(id) { if (onChange) onChange(id, values[id]); }

    function label(field, forId) {
      var l = node('label', 'field-label', field.label);
      if (forId) l.setAttribute('for', forId);
      return l;
    }

    var BUILD = {
      range: function (f, box) {
        var head = node('div', 'field-head');
        var val = node('span', 'field-value', String(f.value));
        head.appendChild(label(f, f.id));
        head.appendChild(val);
        var input = node('input', 'ctl-range');
        input.type = 'range';
        input.id = f.id;
        input.min = f.min; input.max = f.max; input.step = f.step || 1; input.value = f.value;
        values[f.id] = Number(f.value);
        input.addEventListener('input', function () {
          values[f.id] = Number(input.value);
          val.innerHTML = f.format ? f.format(values[f.id]) : input.value;
          fire(f.id);
        });
        val.innerHTML = f.format ? f.format(values[f.id]) : String(f.value);
        box.appendChild(head);
        box.appendChild(input);
        return input;
      },
      select: function (f, box) {
        var input = node('select', 'ctl');
        input.id = f.id;
        f.options.forEach(function (o) {
          var opt = node('option', null, o.label);
          opt.value = o.value;
          input.appendChild(opt);
        });
        input.value = f.value != null ? f.value : f.options[0].value;
        values[f.id] = input.value;
        input.addEventListener('change', function () { values[f.id] = input.value; fire(f.id); });
        box.appendChild(label(f, f.id));
        box.appendChild(input);
        return input;
      },
      number: function (f, box) {
        var input = node('input', 'ctl');
        input.type = 'number';
        input.id = f.id;
        if (f.min != null) input.min = f.min;
        if (f.max != null) input.max = f.max;
        input.value = f.value;
        values[f.id] = Number(f.value);
        input.addEventListener('input', function () { values[f.id] = Number(input.value); fire(f.id); });
        box.appendChild(label(f, f.id));
        box.appendChild(input);
        return input;
      },
      check: function (f, box) {
        var row = node('label', 'check-row');
        var input = node('input');
        input.type = 'checkbox';
        input.id = f.id;
        input.checked = !!f.value;
        values[f.id] = !!f.value;
        input.addEventListener('change', function () { values[f.id] = input.checked; fire(f.id); });
        row.appendChild(input);
        row.appendChild(node('span', null, f.label));
        box.appendChild(row);
        return input;
      },
      button: function (f, box) {
        var b = node('button', 'btn btn--' + (f.variant || 'soft') + ' btn--block', f.label);
        b.type = 'button';
        b.id = f.id;
        b.addEventListener('click', function () { values[f.id] = true; fire(f.id); });
        box.appendChild(b);
        return b;
      },
      /* a set of buttons where exactly one is chosen — an algorithm, a structure */
      choice: function (f, box) {
        var stack = node('div', 'btn-stack');
        values[f.id] = f.value != null ? f.value : f.options[0].value;
        box.appendChild(label(f));
        f.options.forEach(function (o) {
          var b = node('button', 'btn btn--soft btn--block', o.label);
          b.type = 'button';
          b.dataset.value = o.value;
          b.setAttribute('aria-pressed', String(o.value === values[f.id]));
          b.addEventListener('click', function () {
            values[f.id] = o.value;
            Array.prototype.forEach.call(stack.children, function (c) {
              c.setAttribute('aria-pressed', String(c.dataset.value === o.value));
            });
            fire(f.id);
          });
          stack.appendChild(b);
        });
        box.appendChild(stack);
        return stack;
      },
      note: function (f, box) { box.appendChild(node('p', 'field-note', f.label)); return null; },
    };

    fields.forEach(function (f) {
      var box = node('div', 'field' + (f.spacer ? ' rail-spacer' : ''));
      inputs[f.id] = BUILD[f.kind](f, box);
      groups[f.id] = box;
      root.appendChild(box);
    });

    return {
      el: function (id) { return inputs[id]; },
      get: function (id) { return values[id]; },
      set: function (id, v) {
        var input = inputs[id];
        if (!input || input.tagName === 'DIV') return;
        input.value = v;
        values[id] = input.type === 'range' || input.type === 'number' ? Number(v) : v;
        input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
      },
      show: function (id, on) { if (groups[id]) groups[id].hidden = !on; },
      disable: function (id, off) { if (inputs[id]) inputs[id].disabled = !!off; },
    };
  };
})();
