import { Scene, Vector3 } from "@babylonjs/core";
import { RoomModel } from "./model/roomModel";
import { Environment } from "./environment";
import { EnemyManager } from "./entities/enemy/enemyManager";
import { DoorModel } from "./model/doorModel";
import { Utils } from "./utils";

export class Level {
    private readonly _scene: Scene;
    private readonly _environment: Environment;
    private _rooms: RoomModel[][] = [];
    public static readonly ROOMS_GAP = 200;
    public enemyManager: EnemyManager | null = null;

    constructor(scene: Scene) {
        this._scene = scene;
        this._environment = new Environment(this._scene); // Initialize Environment
    }

    public setEnemyManager(enemyManager: EnemyManager): void {
        this.enemyManager = enemyManager;
    }

    public generateSimpleRandomLevel(numberOfRoomsX: number, numberOfRoomsY: number, roomSize: Vector3): RoomModel[][] {
        this._rooms = Array.from({ length: numberOfRoomsX }, () => Array<RoomModel>(numberOfRoomsY));

        for (let x = 0; x < numberOfRoomsX; x++) {
            for (let y = 0; y < numberOfRoomsY; y++) {
                const roomPosition = new Vector3(x * Level.ROOMS_GAP, 0, y * Level.ROOMS_GAP);
                const room = new RoomModel(`Room_${x}_${y}`, roomSize, roomPosition, RoomModel.IS_NORMAL);
                this._rooms[x][y] = room;

                // Connect adjacent rooms
                if (x > 0) this.createExit(room, this._rooms[x - 1][y], DoorModel.NORTH);
                if (y > 0) this.createExit(room, this._rooms[x][y - 1], DoorModel.WEST);
            }
        }

        // Set the initial room for the player
        const centerX = Math.floor(numberOfRoomsX / 2);
        const centerY = Math.floor(numberOfRoomsY / 2);
        this.playerEnterRoom(this._rooms[centerX][centerY]);
        return this._rooms;
    }

    public generateStage(numberOfRooms: number, gridSizeX: number, gridSizeY: number): RoomModel[][] {
        this._rooms = Array.from({ length: gridSizeY }, () => Array<RoomModel>(gridSizeX));
        const centerX = Math.floor(gridSizeX / 2);
        const centerY = Math.floor(gridSizeY / 2);
        let roomsSet = 1;
        let x = centerX;
        let y = centerY; 
        let roomPosition = new Vector3(centerX * Level.ROOMS_GAP, 0, centerY * Level.ROOMS_GAP);
        let roomSize = this._generateRoomSize();
        let currentRoom = new RoomModel(`Room_${centerX}_${centerY}`, roomSize, roomPosition, RoomModel.IS_NORMAL);
        this._rooms[centerY][centerX] = currentRoom;
        while(roomsSet < numberOfRooms) {
            let direction = Utils.getRandomArbitrary(0, 6);
            switch(direction) {
                case DoorModel.NORTH:
                    if(y > 0) {
                        y--;
                        if(currentRoom.doors[DoorModel.NORTH] === null) {
                            if(this._rooms[y][x] !== undefined) {
                                let nextRoom = this._rooms[y][x];
                                this.createExit(currentRoom, nextRoom, DoorModel.NORTH);
                                currentRoom = nextRoom;
                            } else {
                                currentRoom = this._createNextRoom(currentRoom, x, y, RoomModel.IS_NORMAL, DoorModel.NORTH);
                                this._rooms[y][x] = currentRoom;
                                roomsSet++;
                            }
                        } else if(this._rooms[y][x] !== undefined) {
                            currentRoom = this._rooms[y][x];
                        }
                    } else {
                        currentRoom = this._rooms[centerY][centerX];
                        x = centerX;
                        y = centerY;
                    } 
                    break;
                case DoorModel.SOUTH:
                    if(y < this._rooms.length-1) {
                        y++;
                        if(currentRoom.doors[DoorModel.SOUTH] === null) {
                            if(this._rooms[y][x] !== undefined) {
                                let nextRoom = this._rooms[y][x];
                                this.createExit(currentRoom, nextRoom, DoorModel.SOUTH);
                                currentRoom = nextRoom;
                            } else {
                                currentRoom = this._createNextRoom(currentRoom, x, y, RoomModel.IS_NORMAL, DoorModel.SOUTH);
                                this._rooms[y][x] = currentRoom;
                                roomsSet++;
                            }
                        } else if(this._rooms[y][x] !== undefined) {
                            currentRoom = this._rooms[y][x];
                        }
                    } else {
                        currentRoom = this._rooms[centerY][centerX];
                        x = centerX;
                        y = centerY;
                    }
                    break;
                case DoorModel.EAST:
                    if(x < this._rooms[y].length - 1) {
                        x++;
                        if(currentRoom.doors[DoorModel.EAST] === null) {
                            if(this._rooms[y][x] !== undefined) {                                    
                                let nextRoom = this._rooms[y][x];
                                this.createExit(currentRoom, nextRoom, DoorModel.EAST);
                                currentRoom = nextRoom;
                            } else {
                                currentRoom = this._createNextRoom(currentRoom, x, y, RoomModel.IS_NORMAL, DoorModel.EAST);
                                this._rooms[y][x] = currentRoom;
                                roomsSet++;
                            }
                        } else if(this._rooms[y][x] !== undefined) {
                            currentRoom = this._rooms[y][x];
                        } else {
                            currentRoom = this._rooms[centerY][centerX];
                            x = centerX;
                            y = centerY;
                        }
                    }
                    break;
                case DoorModel.WEST:
                    if(x > 0) {
                        x--;
                        if(currentRoom.doors[DoorModel.WEST] === null) {
                            if(this._rooms[y][x] !== undefined) {
                                let nextRoom = this._rooms[y][x];
                                this.createExit(currentRoom, nextRoom, DoorModel.WEST);
                                currentRoom = nextRoom;
                            } else {
                                currentRoom = this._createNextRoom(currentRoom, x, y, RoomModel.IS_NORMAL, DoorModel.WEST);
                                this._rooms[y][x] = currentRoom;
                                roomsSet++;
                            }
                        } else if(this._rooms[y][x] !== undefined) {
                            currentRoom = this._rooms[y][x];
                        } else {
                            currentRoom = this._rooms[centerY][centerX];
                            x = centerX;
                            y = centerY;
                        }
                    }
                    break;
                default:
                    currentRoom = this._rooms[centerY][centerX];
                    x = centerX;
                    y = centerY;
                    break;
            }
        }
        return this._rooms;
    }

    private _generateRoomSize(): Vector3 {
        let length = Utils.getRandomArbitrary(RoomModel.ROOM_SIZE_MIN, RoomModel.ROOM_SIZE_MAX);
        let width = Utils.getRandomArbitrary(RoomModel.ROOM_SIZE_MIN, RoomModel.ROOM_SIZE_MAX);
        if(length%2 != 0) {
            length++;
        }
        if(width%2 != 0) {
            width++;
        }
        let roomSize = new Vector3(length, RoomModel.ROOM_SIZE_HEIGHT, width);
        return roomSize;
    }

    private _createNextRoom(currentRoom: RoomModel, x: number, y: number, type: "is_normal" | "is_boss", direction: 0 | 1 | 2 | 3): RoomModel {
        const roomPosition = new Vector3(x * Level.ROOMS_GAP, 0, y * Level.ROOMS_GAP);
        let roomSize = this._generateRoomSize();
        const nextRoom = new RoomModel(`Room_${x}_${y}`, roomSize, roomPosition, type);
        this.createExit(currentRoom, nextRoom, direction);
        return nextRoom;
    }

    public generateGrid(gridSizeX: number, gridSizeY: number, roomSize: Vector3): void {
        this._rooms = Array.from({ length: gridSizeX }, () => Array<RoomModel>(gridSizeY));

        for (let x = 0; x < gridSizeX; x++) {
            for (let y = 0; y < gridSizeY; y++) {
                const roomPosition = new Vector3(x * Level.ROOMS_GAP, 0, y * Level.ROOMS_GAP);
                const room = new RoomModel(`Room_${x}_${y}`, roomSize, roomPosition, RoomModel.IS_NORMAL);
                this._rooms[x][y] = room;

                // Connect adjacent rooms
                if (x > 0) this.createExit(room, this._rooms[x - 1][y], DoorModel.NORTH);
                if (y > 0) this.createExit(room, this._rooms[x][y - 1], DoorModel.WEST);
            }
        }

        // Set the initial room for the player
        const centerX = Math.floor(gridSizeX / 2);
        const centerY = Math.floor(gridSizeY / 2);
        this.playerEnterRoom(this._rooms[centerX][centerY]);
    }

    public createExit(room1: RoomModel, room2: RoomModel, direction: 0 | 1 | 2 | 3): void {
            switch (direction) {
                case DoorModel.NORTH:
                    room1.addDoor(DoorModel.NORTH, room2);
                    room2.addDoor(DoorModel.SOUTH, room1);
                    break;
                case DoorModel.SOUTH:
                    room1.addDoor(DoorModel.SOUTH, room2);
                    room2.addDoor(DoorModel.NORTH, room1);
                    break;
                case DoorModel.EAST:
                    room1.addDoor(DoorModel.EAST, room2);
                    room2.addDoor(DoorModel.WEST, room1);
                    break;
                case DoorModel.WEST:
                    room1.addDoor(DoorModel.WEST, room2);
                    room2.addDoor(DoorModel.EAST, room1);
                    break;
            }
        }

    public getRooms(): RoomModel[][] {
        return this._rooms;
    }

    public playerEnterRoom(room: RoomModel): void {
        this._environment.generateRoom(room); // Dynamically generate the room when the player enters
        
        // Spawn enemies in the entered room, if the EnemyManager is defined
        if (this.enemyManager && !room.isCompleted()) {
            this.enemyManager.spawnEnemiesForThreat(room);
        }
    }
}