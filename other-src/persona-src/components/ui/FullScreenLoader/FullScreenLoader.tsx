import React from 'react';
import styles from './style.module.scss';

const FullScreenLoader = () => {
    return (
        <div className={styles.loaderContainer}>
            <div className={styles.spinner}></div>
        </div>
    );
};

export default FullScreenLoader;
