import { Item } from "./items";

export class Inventory {
    private _items: Item[] = [];
    private _capacity: number;

    constructor(capacity: number) {
        this._capacity = capacity;
    }

    public addItem(item: Item): boolean {
        if (this._items.length < this._capacity) {
            this._items.push(item);
            return true;
        }
        return false;
    }

    public removeItem(itemName: string): boolean {
        const idx = this._items.findIndex(i => i.name === itemName);
        if (idx !== -1) {
            this._items.splice(idx, 1);
            return true;
        }
        return false;
    }

    public getItems(): Item[] {
        return this._items;
    }
}