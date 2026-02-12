const { conn, mySqlQury } = require('./db');

/**
 * Parameterized query helper — use this to prevent SQL injection.
 * Usage: await DataQuery("SELECT * FROM users WHERE id = ?", [userId])
 */
async function DataQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

/**
 * Legacy DataFind — runs a raw SQL string.
 * Prefer DataQuery() with parameterized queries for new code.
 */
async function DataFind(query) {
    return await mySqlQury(query);
}

/**
 * Insert row into a table.
 * For backwards compatibility, accepts raw SQL strings in values.
 * New code should use DataQuery() with parameterized inserts instead.
 */
async function DataInsert(table, columns, values) {
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${values})`;
    return await mySqlQury(sql);
}

/**
 * Full data insert — runs a raw INSERT SQL string.
 */
async function FullDataInsert(query) {
    return await mySqlQury(query);
}

/**
 * Update rows in a table.
 * For backwards compatibility, accepts raw SQL strings.
 */
async function DataUpdate(table, setClause, whereClause) {
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    return await mySqlQury(sql);
}

/**
 * Delete rows from a table.
 * For backwards compatibility, accepts raw SQL strings.
 */
async function DataDelete(table, whereClause) {
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return await mySqlQury(sql);
}

// ========== Exports ==========
module.exports = {
    DataFind,
    DataInsert,
    DataUpdate,
    DataDelete,
    FullDataInsert,
    DataQuery,
};