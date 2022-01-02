type Node<V> = { parent?: Node<V>; next?: Node<V>; value: V }

class DoublyLinkedList<V> {
  private _head?: Node<V>
  private _tail?: Node<V>

  get head() {
    return this._head!
  }

  get tail() {
    return this._tail!
  }

  set head(node: Node<V>) {
    this._head = node
  }

  set tail(node: Node<V>) {
    this._tail = node
  }

  moveTohead(node: Node<V>) {
    if (this._head) this._head.parent = node
    node.next = this._head
    if (this._tail === node) this._tail = this._tail.parent
    this._head = node
    return node
  }

  unshift(value: V) {
    let node = { value } as Node<V>
    let _head = this._head
    this._head = node
    this._head.next = _head
    if (_head) _head.parent = node
    if (!this._tail) this._tail = node
    return node
  }

  pop() {
    const _tail = this._tail!
    this._tail = _tail.parent
    return _tail
  }

  index(n: number) {
    let count = 0
    let node: Node<V> | undefined = this._head
    while (node && count < n) {
      node = node.next as Node<V>
      count++
    }
    return node
  }
}

class LRU<K, V> {
  private _size = 0
  private cache = new Map<K, Node<V>>()
  private weakKeyMap = new WeakMap<Node<V>, K>()
  private _dll = new DoublyLinkedList<V>()

  constructor(private max: number = 500) {}

  get size() {
    return this._size
  }

  get dll() {
    return this._dll
  }

  get(key: K): Node<V> | undefined {
    if (this.cache.has(key)) {
      const node = this.cache.get(key)
      return this._dll.moveTohead(node!)
    }
  }

  set(key: K, value: V) {
    if (this.cache.has(key)) {
      let node = this.cache.get(key)!
      node.value = value
      return this._dll.moveTohead(node)
    }
    let node = this._dll.unshift(value)
    this.weakKeyMap.set(node, key)
    this.cache.set(key, node)
    this._size++
    if (this._size > this.max) {
      this.cache.delete(this.weakKeyMap.get(this._dll.pop())!)
      this._size--
    }
    return node
  }
}

export { LRU }
