export class Table {
  private rows: string[][] = [];

  constructor(private columns: string[]) {
    this.rows = [];
  }

  addRow(value: string[]) {
    this.rows.push(value);
  }

  addRows(...values: string[][]) {
    this.rows.push(...values);
  }

  render() {
    return [
      // headers
      `| ${this.columns.map((v) => `<strong>${v}</strong>`).join(' | ')} |`,
      // line break to indicate headers
      `| ${this.columns.map(() => '---').join(' | ')} |`,
      // actual data
      ...this.rows.map((row) => `| ${row.join(' | ')} |`),
    ].join('\n');
  }
}
