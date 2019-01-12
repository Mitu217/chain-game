import React, { Component } from 'react';
import '../styles/Title.css';

class Title extends Component {

    render() {
        const { moveGame } = this.props;

        return (
            <div className="Title">
                <p className="Title-Text">しりとり</p>
                <button className="Title-Button" onClick={moveGame}>スタート</button>
            </div>
        );
    }

}

export default Title;
