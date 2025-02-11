import { Component, OnDestroy } from '@angular/core';
import { Server } from "../../../classes/server";
import { Database } from "../../../classes/database";
import { MatTableDataSource } from "@angular/material/table";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Relation } from "../../../classes/relation";
import { RequestService } from "../../../shared/request.service";
import { Table } from "../../../classes/table";
import { isSQL } from "../../../shared/helper";
import { DrawerService } from "../../../shared/drawer.service";
import { Subscription } from "rxjs";

class ExtendedRelation extends Relation {
	id!: string;
}

@Component({
	selector: 'app-relations',
	templateUrl: './relations.component.html',
	styleUrls: ['./relations.component.scss'],
})
export class RelationsComponent implements OnDestroy {

	selectedServer?: Server;
	selectedDatabase?: Database;
	relations?: Relation[];

	drawerObs!: Subscription;
	constraints?: string[];
	actionColum = "##ACTION##";
	displayedColumns: {[key: string]: string} = {};
	dataSource!: MatTableDataSource<ExtendedRelation>;
	expanded: string[] = [];

	protected readonly isSQL = isSQL;

	constructor(
		private drawer: DrawerService,
		private request: RequestService,
		private snackBar: MatSnackBar) {

		this.drawerObs = this.drawer.drawer.openedChange.subscribe(async (state) => {
			if (!state) {
				return;
			}
			await this.refreshData();
		});
	}

	ngOnDestroy() {
		this.drawerObs.unsubscribe();
	}

	async refreshData() {
		this.selectedDatabase = Database.getSelected();
		this.selectedServer = Server.getSelected();
		this.constraints = this.selectedServer?.driver.language.constraints;

		this.displayedColumns = {
			'table_source': 'Table',
			'column_source': 'Column',
			'table_dest': "Referenced Table",
			'column_dest': "Referenced Column"
		};
		if (isSQL()) {
			this.displayedColumns[this.actionColum] = this.actionColum;
		}
		this.relations = this.selectedServer?.relations.filter(relation => relation.database === this.selectedDatabase?.name);
		this.dataSource = new MatTableDataSource(<ExtendedRelation[]>this.relations?.map(re => {
			(<ExtendedRelation>re).id = JSON.stringify(re);
			return re;
		}));
	}

	tableComparison(t1: Table, t2?: Table): boolean {
		return t1.name === t2?.name;
	}

	applyFilter(value: string) {
		this.dataSource.filter = value.trim().toLowerCase();
	}

	async delete(relation: Relation) {
		await this.request.post('relation/drop', {relation});
		this.snackBar.open(`Dropped ${relation.name}`, "⨉", {duration: 3000});
		await this.request.reloadServer(Server.getSelected(), false);
		await this.refreshData();
	}

	async add(sourceTable: Table, sourceColumn: string, destTable: Table, destColumn: string, update_rule: string, delete_rule: string) {
		const relation = <Relation>{
			name: "fk_" + sourceTable.name + '_' + sourceColumn,
			database: this.selectedDatabase!.name,
			table_source: sourceTable.name,
			table_dest: destTable.name,
			column_source: sourceColumn,
			column_dest: destColumn,
			update_rule,
			delete_rule
		};

		await this.request.post('relation/add', {relation});
		this.snackBar.open(`Added relation ${relation.name}`, "⨉", {duration: 3000});
		await this.request.reloadServer(Server.getSelected(), false);
		await this.refreshData();
	}

	protected readonly Object = Object;
}
