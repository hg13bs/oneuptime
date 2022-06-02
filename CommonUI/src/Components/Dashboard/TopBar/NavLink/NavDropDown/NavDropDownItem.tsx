import React, { FC, MouseEventHandler, ReactElement } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

export interface ComponentProps {
    title: string;
    description?: string;
    onClick?: MouseEventHandler;
}

const NavDropDownItem: FC<ComponentProps> = ({
    title,
    description,
    onClick,
}): ReactElement => {
    return (
        <div className="body" onClick={onClick}>
            <div className="nav-details">
                <h4>{title}</h4>
                {description && <p>{description}</p>}
            </div>
            <div>
                <FontAwesomeIcon icon={faArrowRight} />
            </div>
        </div>
    );
};

export default NavDropDownItem;
