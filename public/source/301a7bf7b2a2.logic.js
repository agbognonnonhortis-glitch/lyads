
class Component extends DCLogic {
  state = { tab: 0, cur: 0, menu: false };

  componentDidMount() {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.style.transition = 'opacity .55s ease, transform .55s ease';
        el.style.opacity = '1';
        el.style.transform = 'none';
        io.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      io.observe(el);
    });
  }

  renderVals() {
    const on = (a, b) => (a === b ? '1' : '0');
    const t = this.state.tab, c = this.state.cur;
    return {
      glow: this.props.lueur ?? 'pulsation',
      rotoff: (this.props.rotation ?? true) ? '0' : '1',
      vides: (this.props.marqueursVides ?? true) ? '1' : '0',
      bandeauOn: (this.props.bandeau ?? true) ? '1' : '0',
      tab1: on(t, 0), tab2: on(t, 1), tab3: on(t, 2),
      setTab1: () => this.setState({ tab: 0 }),
      setTab2: () => this.setState({ tab: 1 }),
      setTab3: () => this.setState({ tab: 2 }),
      cur1: on(c, 0), cur2: on(c, 1), cur3: on(c, 2),
      setCur1: () => this.setState({ cur: 0 }),
      setCur2: () => this.setState({ cur: 1 }),
      setCur3: () => this.setState({ cur: 2 }),
      menuOn: this.state.menu ? '1' : '0',
      toggleMenu: () => this.setState((s) => ({ menu: !s.menu }))
    };
  }
}
