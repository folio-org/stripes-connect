export default class ResourceRegistry {
  constructor() {
    this.list = [];
  }

  add(array) {
    this.list.push(array);
  }

  clear() {
    for (let i = 0, l = this.list.length; i < l; i++) {
      this.list[i].splice(0, this.list[i].length);
      this.list[i] = null;
    }
    this.list = [];
  }
}
